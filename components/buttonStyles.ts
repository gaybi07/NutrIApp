/**
 * Los 6 formatos de botón acordados (ver design-scratch/botones-alacena.html).
 * Viven en components/ para que Tailwind vea las clases completas.
 *
 *  primary       -> la acción principal de la pantalla (Agregar, Guardar, Sumar)
 *  secondary     -> acciones útiles, no principales (Ver lista, Preparar, Revisar)
 *  neutral       -> salir sin hacer nada (Cancelar, Cerrar)
 *  danger        -> sacar / borrar, siempre con texto o ícono rojo
 *  dangerSolid   -> solo en el paso "¿Seguro?" de una acción destructiva
 *  success       -> cerrar algo bien hecho (Consumir, Marcar OK)
 */
export type ButtonVariant = "primary" | "secondary" | "neutral" | "danger" | "dangerSolid" | "success";

const BASE =
  "inline-flex items-center justify-center gap-1.5 border font-mono font-semibold uppercase tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-45";

const SIZES = {
  md: "rounded-xl px-3.5 py-2.5 text-[11px]",
  sm: "rounded-lg px-2.5 py-2 text-[10px]",
} as const;

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-gold bg-gold text-white hover:brightness-110",
  secondary: "border-gold/60 bg-gold/10 text-gold",
  neutral: "border-border bg-surfaceAlt/50 text-textMuted",
  danger: "border-rust/60 bg-rust/10 text-rust",
  dangerSolid: "border-rust bg-rust text-white hover:brightness-110",
  success: "border-sage/55 bg-sage/10 text-sage",
};

export function btn(variant: ButtonVariant, size: keyof typeof SIZES = "md", block = false) {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}${block ? " w-full" : ""}`;
}

/** Chips de filtro: activo en violeta sólido, inactivo en gris. */
export function chip(active: boolean) {
  return `rounded-full border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
    active ? "border-gold bg-gold text-white" : "border-border text-textMuted"
  }`;
}
