// Helpers de texto/normalización para nombres de alimentos, sin "use client" a
// propósito: las rutas de API (parse-meal, etc.) los necesitan del lado
// servidor para resolver alimentos contra la tabla `foods` antes de llamar a
// la IA. Antes vivían en lib/useInventory.ts (que sí tiene "use client"), que
// los sigue re-exportando para no romper a nadie que ya los importaba de ahí.

import { InventoryCategory, InventoryItem, InventoryNutrition } from "./types";

export function inventoryKey(name: string) {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.endsWith("s") && !normalized.endsWith("ss") ? normalized.slice(0, -1) : normalized;
}

/** Alias de inventoryKey para el contexto de la tabla `foods` -- misma
 * normalización a propósito, así "Huevos" de una comida y "huevo" de la
 * alacena caen en la misma fila. */
export const foodKey = inventoryKey;

export function defaultUnitForName(name: string): InventoryItem["unit"] {
  const key = inventoryKey(name);
  if (
    /(huevo|palta|banana|manzana|mandarina|naranja|pera|durazno|kiwi|yogur|yogurt|tomate|cebolla|papa|morron|limon|alfajor|medialuna|factura|empanada|sandwich|sanguche|barrita|pancho|hamburgues|salchicha)/.test(
      key
    )
  )
    return "u.";
  if (/(leche|agua|aceite|salsa|jugo|vinagre|vino|cerveza|gaseosa)/.test(key)) return "ml";
  return "g";
}

// Envases sin cantidad explícita ("una botella de aceite", "cajas de
// leche", "un pote de yogur") — se guardaban con el nombre del envase
// pegado y "1" tal cual, como si fuera 1 gramo/ml. Caja/botella/frasco de
// algo líquido se estima en 1 litro (lo más común: tetra brik, botella de
// aceite/agua); el resto de los envases (pote, paquete, lata, bolsa,
// sachet — demasiado variables en tamaño para adivinar bien) quedan como
// "N u." con el nombre limpio, listos para ajustar a mano o con "Revisar
// con IA".
const CONTAINER_RE = /^(?:(\d+(?:[.,]\d+)?)|una?)?\s*(cajas?|botellas?|frascos?|potes?|paquetes?|latas?|bolsas?|sachets?)\s+de\s+(.+)$/i;
const BOTTLE_LIKE = /^(caja|cajas|botella|botellas|frasco|frascos)$/;
const BOTTLE_ML = 1000;

/** Categoría por defecto para lo que se carga a mano/dictado (sin pasar por
 * la IA, que ya clasifica ella misma) — heurística simple por palabras
 * clave, así todo lo de la alacena queda filtrable por categoría sin
 * excepción, venga de donde venga. */
export function defaultCategoryForName(name: string): InventoryCategory {
  const key = inventoryKey(name);
  if (/(pollo|carne|cerdo|vacuno|milanesa|pescado|atun|jamon|salchicha|chorizo|pechuga|bife|asado|hamburgues|panceta|huevo)/.test(key)) return "proteina_animal";
  if (/(tofu|seitan|soja|lenteja|garbanzo|poroto|hummus)/.test(key)) return "proteina_vegetal";
  if (/(leche|yogur|yogurt|queso|manteca|crema|ricota)/.test(key)) return "lacteos";
  if (/(tomate|cebolla|papa|zanahoria|zapallo|lechuga|morron|repollo|brocoli|verdura|espinaca|ajo|choclo|berenjena|acelga)/.test(key)) return "verduras";
  if (/(banana|manzana|naranja|limon|frutilla|pera|uva|fruta|palta|mandarina|durazno|kiwi)/.test(key)) return "frutas";
  if (/(harina|arroz|fideo|pasta|avena|pan|galletita|cereal)/.test(key)) return "harinas";
  if (/(agua|jugo|gaseosa|vino|cerveza|bebida|mate|cafe|te)/.test(key)) return "bebidas";
  if (/(sal|azucar|aceite|vinagre|salsa|mayonesa|mostaza|condimento|especia)/.test(key)) return "condimentos";
  return "otros";
}

// Ojo con el orden: "kilo"/"litro" tienen que probarse ANTES que sus
// abreviaturas de una sola letra ("l") — si no, en una alternancia regex
// sin límite de palabra, "l" matchea de entrada las primeras letras de
// "litro"/"limón" y trunca el nombre ("itro de leche"). El \b al final
// del grupo evita justamente eso: obliga a que la unidad matcheada sea
// la palabra completa, no un prefijo suelto de la palabra siguiente.
const UNIT_TOKENS = "kilogramos?|kilos?|kg|gramos?|gr|g|litros?|mililitros?|lt|ml|l|unidades?|u\\.?";
// Grupo capturable (así match[unitIndex] sigue trayendo el texto de la
// unidad) envuelto en su propio \b — se usa siempre como "(?:UNIT_RE)?"
// para que el "?" de opcionalidad no agregue un grupo de captura extra.
const UNIT_RE = `(${UNIT_TOKENS})\\b`;

/** Normaliza la unidad cruda que devolvió el regex a las 3 que usa el
 * inventario (g/ml/u.), con su multiplicador — "kilo(s)" y "litro(s)"
 * (palabra completa, como los escribe la gente a mano o dicta) se tratan
 * igual que "kg" y "l". */
function unitInfo(rawUnit: string): { unit: InventoryItem["unit"]; multiplier: number } {
  if (/^(kilogramos?|kilos?|kg)$/.test(rawUnit)) return { unit: "g", multiplier: 1000 };
  if (/^(gramos?|gr|g)$/.test(rawUnit)) return { unit: "g", multiplier: 1 };
  if (/^(litros?|lt|l)$/.test(rawUnit)) return { unit: "ml", multiplier: 1000 };
  if (/^(mililitros?|ml)$/.test(rawUnit)) return { unit: "ml", multiplier: 1 };
  return { unit: "u.", multiplier: 1 };
}

export interface ParsedInventoryEntry {
  name: string;
  quantity: number;
  unit: InventoryItem["unit"];
  // Envase sin tamaño conocido (pote/paquete/lata/bolsa/sachet) — "quantity"
  // acá es la cantidad de ENVASES (no el peso real), a la espera de que se
  // resuelva contra la memoria de productos o preguntándole al usuario.
  needsQuantity?: boolean;
  // false cuando "unit" salió de adivinar (defaultUnitForName) en vez de
  // venir explícito en el texto ("2 alfajor" sin unidad vs "500g harina")
  // — así se sabe cuándo es seguro dejar que la memoria de productos
  // pise la adivinanza con la unidad real que ya se le conoció antes.
  unitExplicit?: boolean;
}

export interface RestoreFallback {
  name: string;
  unit: InventoryItem["unit"];
  category?: InventoryCategory;
  nutritionPer100g?: InventoryNutrition;
  zona?: InventoryItem["zona"];
}

/** A qué InventoryItem existente le corresponde sumarle stock devuelto --
 * primero por id (el caso normal), y si no existe más (se borró al llegar a
 * 0) por nombre+unidad normalizados, para no crear un duplicado si ya hay
 * otro "Leche" con la misma unidad en la lista. Devuelve undefined cuando
 * hay que insertar un producto nuevo desde el fallback. Antes esta misma
 * lógica vivía copiada en useInventory.ts (local) y useSharedInventory.ts
 * (compartida) -- una sola versión acá, cada hook solo decide CÓMO persistir
 * el resultado (localStorage vs. Supabase). */
export function findRestoreTarget(items: InventoryItem[], id: string, fallback?: RestoreFallback): InventoryItem | undefined {
  const byId = items.find((item) => item.id === id);
  if (byId) return byId;
  if (!fallback) return undefined;
  return items.find((item) => inventoryKey(item.name) === inventoryKey(fallback.name) && item.unit === fallback.unit);
}

export function parseInventoryText(text: string): ParsedInventoryEntry[] {
  return text
    .split(/\n|,|\||\s+y\s+/i)
    .map((part) => part.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .map((part) => {
      const container = part.match(CONTAINER_RE);
      if (container) {
        const amount = container[1] ? Number(container[1].replace(",", ".")) : 1;
        const foodName = container[3].trim().toLowerCase();
        if (BOTTLE_LIKE.test(container[2].toLowerCase()) && defaultUnitForName(foodName) === "ml") {
          return { name: foodName, quantity: amount * BOTTLE_ML, unit: "ml" as const };
        }
        return { name: foodName, quantity: amount, unit: "u." as const, needsQuantity: true };
      }
      const article = part.match(/^(un|una)\s+(.+)$/i);
      if (article) return { name: article[2].trim().toLowerCase(), quantity: 1, unit: "u." as const };
      const match =
        part.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(?:${UNIT_RE})?\\s*(?:de\\s+)?(.+)$`, "i")) ||
        part.match(new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(?:${UNIT_RE})?$`, "i"));
      if (!match) return { name: part.toLowerCase(), quantity: 1, unit: "u." as const };
      const amountIndex = typeof match[1] === "string" && /\d/.test(match[1]) ? 1 : 2;
      const nameIndex = amountIndex === 1 ? 3 : 1;
      const unitIndex = amountIndex === 1 ? 2 : 3;
      const amount = Number(match[amountIndex].replace(",", "."));
      const unitExplicit = Boolean(match[unitIndex]);
      const rawUnit = (match[unitIndex] || defaultUnitForName(match[nameIndex])).toLowerCase();
      const { unit, multiplier } = unitInfo(rawUnit);
      return { name: match[nameIndex].trim().toLowerCase(), quantity: amount * multiplier, unit, unitExplicit };
    });
}
