export type FoodGroup = "proteina_animal" | "proteina_vegetal" | "lacteo" | "verdura" | "fruta" | "cereal" | "grasa" | "otro";

export const FOOD_GROUP_LABELS: Record<FoodGroup, string> = {
  proteina_animal: "Proteínas animales",
  proteina_vegetal: "Proteínas vegetales",
  lacteo: "Lácteos",
  verdura: "Verduras",
  fruta: "Frutas",
  cereal: "Cereales",
  grasa: "Grasas",
  otro: "Otros",
};

// Orden de evaluación importa: los patrones más específicos van primero para
// no perderlos contra coincidencias más genéricas (ej. "queso crema" antes que "crema").
const PATTERNS: Array<{ group: FoodGroup; regex: RegExp }> = [
  { group: "proteina_animal", regex: /pollo|pechuga|carne|vacuno|res|cerdo|cordero|pescado|salmon|salmón|atun|atún|merluza|mariscos|camaron|camarón|huevo|jamon|jamón|panceta|chorizo|milanesa|peceto|lomo(?!\s*de\s*cerdo)|bife/i },
  { group: "proteina_vegetal", regex: /lentejas?|garbanzos?|porotos?|soja|tofu|seitan|seitán|arvejas?|hummus/i },
  { group: "lacteo", regex: /leche|yogur|yogurt|queso|manteca|crema de leche|ricota|dulce de leche/i },
  { group: "verdura", regex: /tomate|cebolla|lechuga|espinaca|brocoli|brócoli|zanahoria|zapallo|calabaza|pimiento|morron|morrón|apio|remolacha|acelga|repollo|coliflor|berenjena|pepino|choclo|papa(?!s\s*fritas)|batata|palta|verdura/i },
  { group: "fruta", regex: /banana|manzana|naranja|frutilla|frutillas|arandano|arándano|mandarina|durazno|sandia|sandía|melon|melón|pera|uva|kiwi|ciruela|mango|ananá|ananas|limon|limón|fruta/i },
  { group: "cereal", regex: /arroz|pasta|fideos|pan|avena|quinoa|harina|tostada|galleta|cereal|granola|maiz|maíz/i },
  { group: "grasa", regex: /aceite|manteca|mayonesa|frutos secos|nueces|almendras|mani|maní/i },
];

/** Clasifica un ingrediente (nombre simple, sin cantidad/unidad) en un grupo alimenticio, por coincidencia de palabras clave. */
export function classifyIngredient(name: string): FoodGroup {
  const normalized = name.toLowerCase();
  for (const { group, regex } of PATTERNS) {
    if (regex.test(normalized)) return group;
  }
  return "otro";
}
