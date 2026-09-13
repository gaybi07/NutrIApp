import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        surfaceAlt: "rgb(var(--color-surface-alt) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        textMuted: "rgb(var(--color-text-muted) / <alpha-value>)",
        gold: "rgb(var(--color-accent) / <alpha-value>)",
        rust: "rgb(var(--color-rust) / <alpha-value>)",
        sage: "rgb(var(--color-sage) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
      },
      fontFamily: {
        // Poppins: títulos (H1), eyebrows/títulos de tarjeta en mayúscula y
        // botones. Inter: cuerpo de texto y — lo más importante — los
        // números (kcal, gramos, pasos), donde tabular-nums necesita una
        // fuente pensada para alinear dígitos en columna.
        display: ["Poppins", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
