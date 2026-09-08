import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#1C1B18",
        surface: "#242220",
        surfaceAlt: "#2D2A26",
        text: "#EDE7DA",
        textMuted: "#9C958A",
        gold: "#C9A227",
        rust: "#B5533C",
        sage: "#8A9A7C",
        border: "#3A362F",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
