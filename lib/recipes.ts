import { InventoryItem } from "@/lib/types";

export type RecipeIngredient = { name: string; quantity: number; unit: InventoryItem["unit"] };

export type Cuisine =
  | "asiatico"
  | "americano"
  | "frances"
  | "rapida"
  | "mediterraneo"
  | "saludable";

export interface Recipe {
  title: string;
  cuisine: Cuisine;
  tags: string[];
  ingredients: RecipeIngredient[];
  time: string;
  summary: string;
  kcal: number;
  protein: number;
}

export const CUISINE_FILTERS: { id: Cuisine; label: string }[] = [
  { id: "asiatico", label: "Asiático" },
  { id: "americano", label: "Americano" },
  { id: "frances", label: "Francés" },
  { id: "rapida", label: "Rápida" },
  { id: "mediterraneo", label: "Mediterránea" },
  { id: "saludable", label: "Saludable" },
];

export const RECIPES: Recipe[] = [
  {
    title: "Bowl de pollo con arroz y verduras",
    cuisine: "asiatico",
    tags: ["asiatico", "saludable", "rapida"],
    ingredients: [{ name: "pollo", quantity: 300, unit: "g" }, { name: "arroz", quantity: 80, unit: "g" }, { name: "brocoli", quantity: 150, unit: "g" }, { name: "cebolla", quantity: 80, unit: "g" }, { name: "salsa de soja", quantity: 15, unit: "ml" }],
    time: "20 min",
    summary: "Equilibrado, alto en proteína y muy práctico para el trabajo.",
    kcal: 620,
    protein: 48,
  },
  {
    title: "Salteado de tofu y vegetales",
    cuisine: "asiatico",
    tags: ["asiatico", "mediterraneo", "saludable"],
    ingredients: [{ name: "tofu", quantity: 200, unit: "g" }, { name: "pimiento", quantity: 100, unit: "g" }, { name: "cebolla", quantity: 80, unit: "g" }, { name: "espinaca", quantity: 80, unit: "g" }, { name: "soja", quantity: 15, unit: "ml" }],
    time: "18 min",
    summary: "Muy bueno si querés algo ligero y rico en vegetales.",
    kcal: 420,
    protein: 28,
  },
  {
    title: "Pollo al horno con papas y tomate",
    cuisine: "americano",
    tags: ["americano", "saludable"],
    ingredients: [{ name: "pollo", quantity: 300, unit: "g" }, { name: "papa", quantity: 300, unit: "g" }, { name: "tomate", quantity: 150, unit: "g" }, { name: "cebolla", quantity: 80, unit: "g" }],
    time: "35 min",
    summary: "Simple, contundente y fácil de repetir varias noches.",
    kcal: 680,
    protein: 52,
  },
  {
    title: "Tacos de pollo con ensalada",
    cuisine: "americano",
    tags: ["americano", "rapida"],
    ingredients: [{ name: "pollo", quantity: 250, unit: "g" }, { name: "tomate", quantity: 120, unit: "g" }, { name: "cebolla", quantity: 60, unit: "g" }, { name: "pimiento", quantity: 80, unit: "g" }],
    time: "15 min",
    summary: "Ideal para usar lo que tenés a mano y no complicarte.",
    kcal: 540,
    protein: 42,
  },
  {
    title: "Salmon con quinoa y espinaca",
    cuisine: "frances",
    tags: ["frances", "saludable"],
    ingredients: [{ name: "salmon", quantity: 250, unit: "g" }, { name: "quinoa", quantity: 80, unit: "g" }, { name: "espinaca", quantity: 80, unit: "g" }, { name: "tomate", quantity: 120, unit: "g" }],
    time: "25 min",
    summary: "Opción más elegante y muy buena para una comida más completa.",
    kcal: 610,
    protein: 40,
  },
  {
    title: "Pasta con queso, tomate y espinaca",
    cuisine: "frances",
    tags: ["frances", "rapida"],
    ingredients: [{ name: "pasta", quantity: 100, unit: "g" }, { name: "queso", quantity: 40, unit: "g" }, { name: "tomate", quantity: 150, unit: "g" }, { name: "espinaca", quantity: 60, unit: "g" }],
    time: "18 min",
    summary: "Sencillo, reconfortante y muy fácil de ajustar al gusto.",
    kcal: 570,
    protein: 24,
  },
  {
    title: "Wrap rápido con huevo y vegetales",
    cuisine: "rapida",
    tags: ["rapida", "saludable"],
    ingredients: [{ name: "huevo", quantity: 2, unit: "u." }, { name: "espinaca", quantity: 60, unit: "g" }, { name: "tomate", quantity: 100, unit: "g" }, { name: "pimiento", quantity: 60, unit: "g" }],
    time: "10 min",
    summary: "Perfecto para una comida rápida y con bastante volumen.",
    kcal: 360,
    protein: 22,
  },
  {
    title: "Lentejas con verduras y huevo",
    cuisine: "mediterraneo",
    tags: ["mediterraneo", "saludable"],
    ingredients: [{ name: "lentejas", quantity: 100, unit: "g" }, { name: "huevo", quantity: 2, unit: "u." }, { name: "cebolla", quantity: 80, unit: "g" }, { name: "tomate", quantity: 120, unit: "g" }, { name: "espinaca", quantity: 60, unit: "g" }],
    time: "25 min",
    summary: "Muy rico, muy saciante y con buen aporte de proteína.",
    kcal: 520,
    protein: 30,
  },
];
