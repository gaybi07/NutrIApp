/** Tope para campos numéricos "normales" (kcal, kg, pasos, edad, altura): 6 dígitos. */
export const MAX_NUMBER_VALUE = 999_999;

/** Tope para campos numéricos de minutos: 4 dígitos. */
export const MAX_MINUTES_VALUE = 9_999;

/** Tope de caracteres para campos de texto libre. */
export const MAX_TEXT_LENGTH = 500;

export function clampNumber(value: number, max: number = MAX_NUMBER_VALUE): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, value));
}

/** Cuenta solo los dígitos de un string (ignora el punto decimal, signos, etc). */
export function countDigits(value: string): number {
  return (value.match(/[0-9]/g) || []).length;
}

/** Máximo de dígitos permitidos para un campo numérico "normal". */
export const MAX_DIGITS = 6;

/** Máximo de dígitos permitidos para un campo de minutos. */
export const MAX_MINUTES_DIGITS = 4;

/**
 * Corrige un bug de React con inputs numéricos controlados: si el valor
 * tipeado (ej. "0220") parsea al mismo número que ya estaba en el state
 * (220), React no vuelve a sincronizar el DOM porque el prop `value` no
 * cambió — y el 0 de más queda pegado en pantalla aunque el state esté
 * bien. Forzamos el string del input al valor canónico para que siempre
 * coincida con lo que ve el usuario.
 */
export function normalizeNumberInput(input: HTMLInputElement): number {
  const num = Number(input.value);
  if (input.value !== "" && !Number.isNaN(num)) {
    const normalized = String(num);
    if (input.value !== normalized) input.value = normalized;
  }
  return num;
}
