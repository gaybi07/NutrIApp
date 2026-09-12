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
        display: ["Quicksand", "sans-serif"],
        sans: ["Nunito", "sans-serif"],
        mono: ["Nunito", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
