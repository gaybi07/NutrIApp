import { MealOption } from "@/lib/types";

/** "130 g Pechuga de pollo, 120 g Arroz integral cocido, 1 u. Huevo" -- lo que se descuenta de la Alacena al comer una opción del plan. */
export function ingredientsToText(option: MealOption): string {
  return (option.ingredientes || []).map((ing) => `${ing.quantity} ${ing.unit === "u." ? "u." : ing.unit} ${ing.name}`).join(", ");
}

/** Mensaje corto con lo que se descontó y lo que no estaba cargado en la Alacena. */
export function inventoryMessage(result: { consumed: string[]; missing: string[] } | void): string {
  if (!result) return "";
  const parts: string[] = [];
  if (result.consumed.length > 0) parts.push(`Se descontó de la Alacena: ${result.consumed.join(", ")}.`);
  if (result.missing.length > 0) parts.push(`No tenías en la Alacena: ${result.missing.join(", ")}.`);
  return parts.join(" ");
}
