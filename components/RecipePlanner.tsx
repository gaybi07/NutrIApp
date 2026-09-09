"use client";

import { useEffect, useMemo, useState } from "react";
import { InventoryItem, MealKey, MEAL_LABELS } from "@/lib/types";
import { inventoryUnitLabel } from "@/lib/useInventory";

type RecipeIngredient = { name: string; quantity: number; unit: InventoryItem["unit"] };
type Region = "rioplatense" | "global";

type Cuisine =
  | "asiatico"
  | "americano"
  | "frances"
  | "italiano"
  | "mexicano"
  | "argentina"
  | "rapida"
  | "mediterraneo"
  | "saludable";

type PlannerRecipe = {
  title: string;
  meals: MealKey[];
  regions: Region[];
  cuisine: Cuisine;
  tags: string[];
  ingredients: RecipeIngredient[];
  time: string;
  summary: string;
  kcal: number;
  protein: number;
  generated?: boolean;
};

const FILTERS: { id: Cuisine; label: string }[] = [
  { id: "asiatico", label: "Asiático" },
  { id: "americano", label: "Americano" },
  { id: "frances", label: "Francés" },
  { id: "italiano", label: "Italiana" },
  { id: "mexicano", label: "Mexicana" },
  { id: "argentina", label: "Argentina" },
  { id: "rapida", label: "Rápida" },
  { id: "mediterraneo", label: "Mediterránea" },
  { id: "saludable", label: "Saludable" },
];

const PREFERENCE_FILTERS: Cuisine[] = ["rapida", "saludable"];

const RECIPES: PlannerRecipe[] = [
  {
    title: "Bowl de pollo con arroz y verduras",
    meals: ["alm", "cen"],
    regions: ["global"],
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
    meals: ["alm", "cen"],
    regions: ["global"],
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
    meals: ["alm", "cen"],
    regions: ["rioplatense", "global"],
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
    meals: ["alm", "cen"],
    regions: ["global"],
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
    meals: ["alm", "cen"],
    regions: ["global"],
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
    meals: ["alm", "cen"],
    regions: ["global"],
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
    meals: ["alm", "cen"],
    regions: ["global"],
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
    meals: ["alm", "cen"],
    regions: ["rioplatense", "global"],
    cuisine: "mediterraneo",
    tags: ["mediterraneo", "saludable"],
    ingredients: [{ name: "lentejas", quantity: 100, unit: "g" }, { name: "huevo", quantity: 2, unit: "u." }, { name: "cebolla", quantity: 80, unit: "g" }, { name: "tomate", quantity: 120, unit: "g" }, { name: "espinaca", quantity: 60, unit: "g" }],
    time: "25 min",
    summary: "Muy rico, muy saciante y con buen aporte de proteína.",
    kcal: 520,
    protein: 30,
  },
  {
    title: "Tostadas con huevo, queso y fruta",
    meals: ["des", "mer"],
    regions: ["rioplatense", "global"],
    cuisine: "rapida",
    tags: ["rapida", "saludable"],
    ingredients: [{ name: "huevo", quantity: 2, unit: "u." }, { name: "pan", quantity: 2, unit: "u." }, { name: "queso", quantity: 30, unit: "g" }, { name: "banana", quantity: 1, unit: "u." }],
    time: "10 min",
    summary: "Un desayuno cotidiano, completo y fácil de adaptar.",
    kcal: 430,
    protein: 24,
  },
  {
    title: "Mate con tostadas y yogur con avena",
    meals: ["des", "mer"],
    regions: ["rioplatense"],
    cuisine: "saludable",
    tags: ["saludable", "rapida"],
    ingredients: [{ name: "mate", quantity: 1, unit: "u." }, { name: "pan", quantity: 2, unit: "u." }, { name: "yogur", quantity: 1, unit: "u." }, { name: "avena", quantity: 40, unit: "g" }, { name: "banana", quantity: 1, unit: "u." }],
    time: "5 min",
    summary: "Clásico de la merienda rioplatense, con fibra y saciedad.",
    kcal: 390,
    protein: 18,
  },
  {
    title: "Milanesa al horno con ensalada",
    meals: ["alm", "cen"],
    regions: ["rioplatense"],
    cuisine: "americano",
    tags: ["americano", "saludable"],
    ingredients: [{ name: "pollo", quantity: 250, unit: "g" }, { name: "pan rallado", quantity: 40, unit: "g" }, { name: "huevo", quantity: 1, unit: "u." }, { name: "tomate", quantity: 150, unit: "g" }, { name: "lechuga", quantity: 80, unit: "g" }],
    time: "30 min",
    summary: "Una opción casera y habitual para almuerzo o cena.",
    kcal: 590,
    protein: 48,
  },
  {
    title: "Tarta de verduras y queso",
    meals: ["alm", "cen"],
    regions: ["rioplatense"],
    cuisine: "mediterraneo",
    tags: ["mediterraneo", "saludable"],
    ingredients: [{ name: "tapa de tarta", quantity: 1, unit: "u." }, { name: "huevo", quantity: 2, unit: "u." }, { name: "cebolla", quantity: 100, unit: "g" }, { name: "espinaca", quantity: 150, unit: "g" }, { name: "queso", quantity: 80, unit: "g" }],
    time: "35 min",
    summary: "Práctica para cocinar una vez y resolver varias comidas.",
    kcal: 520,
    protein: 25,
  },
  {
    title: "Pasta integral con salsa de carne",
    meals: ["alm", "cen"],
    regions: ["global"],
    cuisine: "italiano",
    tags: ["italiano", "saludable"],
    ingredients: [{ name: "pasta", quantity: 100, unit: "g" }, { name: "carne picada", quantity: 150, unit: "g" }, { name: "tomate", quantity: 180, unit: "g" }, { name: "cebolla", quantity: 60, unit: "g" }],
    time: "25 min",
    summary: "Un clásico italiano rendidor, con una versión más equilibrada.",
    kcal: 640,
    protein: 38,
  },
  {
    title: "Fajitas de pollo y vegetales",
    meals: ["alm", "cen"],
    regions: ["global"],
    cuisine: "mexicano",
    tags: ["mexicano", "rapida"],
    ingredients: [{ name: "pollo", quantity: 250, unit: "g" }, { name: "tortilla", quantity: 2, unit: "u." }, { name: "pimiento", quantity: 100, unit: "g" }, { name: "cebolla", quantity: 80, unit: "g" }, { name: "tomate", quantity: 100, unit: "g" }],
    time: "20 min",
    summary: "Colorida, rápida y fácil de ajustar a lo que haya en casa.",
    kcal: 560,
    protein: 44,
  },
  {
    title: "Pechuga rellena con ensalada criolla",
    meals: ["alm", "cen"],
    regions: ["rioplatense"],
    cuisine: "argentina",
    tags: ["argentina", "saludable"],
    ingredients: [{ name: "pollo", quantity: 280, unit: "g" }, { name: "queso", quantity: 40, unit: "g" }, { name: "tomate", quantity: 150, unit: "g" }, { name: "cebolla", quantity: 80, unit: "g" }, { name: "lechuga", quantity: 80, unit: "g" }],
    time: "30 min",
    summary: "Una comida casera argentina, proteica y sin complicaciones.",
    kcal: 510,
    protein: 55,
  },
  {
    title: "Mate cocido con tostadas y dulce",
    meals: ["des", "mer"],
    regions: ["rioplatense"],
    cuisine: "argentina",
    tags: ["argentina", "rapida"],
    ingredients: [{ name: "mate cocido", quantity: 1, unit: "u." }, { name: "pan", quantity: 2, unit: "u." }, { name: "dulce de leche", quantity: 25, unit: "g" }, { name: "queso", quantity: 30, unit: "g" }],
    time: "5 min",
    summary: "Una merienda argentina simple para empezar con ingredientes cotidianos.",
    kcal: 350,
    protein: 13,
  },
  {
    title: "Avena tibia con banana y yogur",
    meals: ["des", "mer"],
    regions: ["global"],
    cuisine: "asiatico",
    tags: ["asiatico", "saludable"],
    ingredients: [{ name: "avena", quantity: 50, unit: "g" }, { name: "banana", quantity: 1, unit: "u." }, { name: "yogur", quantity: 1, unit: "u." }],
    time: "8 min",
    summary: "Desayuno cálido y simple, inspirado en bowls de desayuno asiáticos.",
    kcal: 360,
    protein: 17,
  },
  {
    title: "Pancakes de banana y yogur",
    meals: ["des", "mer"],
    regions: ["global"],
    cuisine: "americano",
    tags: ["americano", "saludable"],
    ingredients: [{ name: "banana", quantity: 1, unit: "u." }, { name: "huevo", quantity: 2, unit: "u." }, { name: "avena", quantity: 50, unit: "g" }, { name: "yogur", quantity: 1, unit: "u." }],
    time: "12 min",
    summary: "Una versión cotidiana y proteica de un clásico americano.",
    kcal: 410,
    protein: 23,
  },
  {
    title: "Tostada francesa con fruta",
    meals: ["des", "mer"],
    regions: ["global"],
    cuisine: "frances",
    tags: ["frances", "rapida"],
    ingredients: [{ name: "pan", quantity: 2, unit: "u." }, { name: "huevo", quantity: 1, unit: "u." }, { name: "leche", quantity: 80, unit: "ml" }, { name: "banana", quantity: 1, unit: "u." }],
    time: "10 min",
    summary: "Rápida, reconfortante y fácil de preparar con lo que hay en casa.",
    kcal: 380,
    protein: 17,
  },
  {
    title: "Frittata italiana de verduras",
    meals: ["des", "mer"],
    regions: ["global"],
    cuisine: "italiano",
    tags: ["italiano", "saludable"],
    ingredients: [{ name: "huevo", quantity: 2, unit: "u." }, { name: "tomate", quantity: 100, unit: "g" }, { name: "espinaca", quantity: 60, unit: "g" }, { name: "queso", quantity: 30, unit: "g" }],
    time: "15 min",
    summary: "Una opción italiana salada que funciona tanto en desayuno como merienda.",
    kcal: 330,
    protein: 25,
  },
  {
    title: "Huevos rancheros con tomate",
    meals: ["des", "alm"],
    regions: ["global"],
    cuisine: "mexicano",
    tags: ["mexicano", "saludable"],
    ingredients: [{ name: "huevo", quantity: 2, unit: "u." }, { name: "tomate", quantity: 150, unit: "g" }, { name: "cebolla", quantity: 50, unit: "g" }, { name: "tortilla", quantity: 1, unit: "u." }],
    time: "15 min",
    summary: "Desayuno mexicano sabroso y con ingredientes fáciles de encontrar.",
    kcal: 420,
    protein: 24,
  },
  {
    title: "Yogur con fruta y frutos secos",
    meals: ["des", "mer"],
    regions: ["global"],
    cuisine: "mediterraneo",
    tags: ["mediterraneo", "saludable"],
    ingredients: [{ name: "yogur", quantity: 1, unit: "u." }, { name: "banana", quantity: 1, unit: "u." }, { name: "avena", quantity: 30, unit: "g" }],
    time: "5 min",
    summary: "Fresco, práctico y equilibrado para una mañana liviana.",
    kcal: 320,
    protein: 16,
  },
];

const INVENTORY_RECIPES: PlannerRecipe[] = [
  {
    title: "Salteado de pollo con arroz",
    meals: ["alm", "cen"], regions: ["global"], cuisine: "rapida", tags: ["inventario", "rapida"],
    ingredients: [{ name: "pollo", quantity: 250, unit: "g" }, { name: "arroz", quantity: 80, unit: "g" }, { name: "cebolla", quantity: 1, unit: "u." }],
    time: "20 min", summary: "Se puede preparar solo con lo que tenés en la alacena.", kcal: 560, protein: 45, generated: true,
  },
  {
    title: "Arroz con huevo y tomate",
    meals: ["des", "alm", "cen"], regions: ["global"], cuisine: "rapida", tags: ["inventario", "rapida"],
    ingredients: [{ name: "arroz", quantity: 80, unit: "g" }, { name: "huevo", quantity: 2, unit: "u." }, { name: "tomate", quantity: 1, unit: "u." }],
    time: "15 min", summary: "Una combinación simple hecha con ingredientes disponibles.", kcal: 430, protein: 20, generated: true,
  },
  {
    title: "Omelette de queso y verduras",
    meals: ["des", "alm", "mer", "cen"], regions: ["global"], cuisine: "rapida", tags: ["inventario", "rapida"],
    ingredients: [{ name: "huevo", quantity: 2, unit: "u." }, { name: "queso", quantity: 30, unit: "g" }, { name: "tomate", quantity: 1, unit: "u." }],
    time: "10 min", summary: "Rápida y posible con básicos de la heladera.", kcal: 350, protein: 25, generated: true,
  },
  {
    title: "Yogur con avena y banana",
    meals: ["des", "mer"], regions: ["global"], cuisine: "rapida", tags: ["inventario", "saludable"],
    ingredients: [{ name: "yogur", quantity: 1, unit: "u." }, { name: "avena", quantity: 30, unit: "g" }, { name: "banana", quantity: 1, unit: "u." }],
    time: "5 min", summary: "Una opción fresca sin ingredientes extra.", kcal: 320, protein: 16, generated: true,
  },
  {
    title: "Ensalada de pollo y tomate",
    meals: ["alm", "cen"], regions: ["global"], cuisine: "rapida", tags: ["inventario", "saludable"],
    ingredients: [{ name: "pollo", quantity: 200, unit: "g" }, { name: "tomate", quantity: 1, unit: "u." }, { name: "cebolla", quantity: 1, unit: "u." }],
    time: "12 min", summary: "Ligera y armada con ingredientes de la heladera.", kcal: 360, protein: 42, generated: true,
  },
];

const EXTRA_RECIPES: PlannerRecipe[] = [
  { title: "Huevos revueltos con tostadas", meals: ["des", "mer"], regions: ["rioplatense", "global"], cuisine: "argentina", tags: ["argentina", "rapida"], ingredients: [{ name: "huevo", quantity: 2, unit: "u." }, { name: "pan", quantity: 2, unit: "u." }, { name: "queso", quantity: 20, unit: "g" }], time: "10 min", summary: "Desayuno simple y rendidor.", kcal: 390, protein: 24 },
  { title: "Tostadas con palta y huevo", meals: ["des", "mer"], regions: ["global"], cuisine: "saludable", tags: ["saludable", "rapida"], ingredients: [{ name: "pan", quantity: 2, unit: "u." }, { name: "palta", quantity: 1, unit: "u." }, { name: "huevo", quantity: 2, unit: "u." }], time: "10 min", summary: "Una opción fresca y completa.", kcal: 440, protein: 22 },
  { title: "Licuado de banana y avena", meals: ["des", "mer"], regions: ["global"], cuisine: "saludable", tags: ["saludable", "rapida"], ingredients: [{ name: "banana", quantity: 1, unit: "u." }, { name: "leche", quantity: 250, unit: "ml" }, { name: "avena", quantity: 40, unit: "g" }], time: "5 min", summary: "Rápido para desayunar o recuperar energía.", kcal: 360, protein: 14 },
  { title: "Mate con tostadas y queso crema", meals: ["des", "mer"], regions: ["rioplatense"], cuisine: "argentina", tags: ["argentina", "rapida"], ingredients: [{ name: "yerba mate", quantity: 1, unit: "u." }, { name: "pan", quantity: 2, unit: "u." }, { name: "queso crema", quantity: 30, unit: "g" }], time: "5 min", summary: "Merienda cotidiana y fácil.", kcal: 300, protein: 10 },
  { title: "Milanesa de carne con papas", meals: ["alm", "cen"], regions: ["rioplatense"], cuisine: "argentina", tags: ["argentina"], ingredients: [{ name: "carne", quantity: 250, unit: "g" }, { name: "pan rallado", quantity: 40, unit: "g" }, { name: "huevo", quantity: 1, unit: "u." }, { name: "papa", quantity: 2, unit: "u." }], time: "35 min", summary: "Clásico argentino para almuerzo o cena.", kcal: 720, protein: 45 },
  { title: "Bife con ensalada criolla", meals: ["alm", "cen"], regions: ["rioplatense"], cuisine: "argentina", tags: ["argentina", "saludable"], ingredients: [{ name: "carne", quantity: 250, unit: "g" }, { name: "tomate", quantity: 1, unit: "u." }, { name: "cebolla", quantity: 1, unit: "u." }, { name: "pimiento", quantity: 1, unit: "u." }], time: "25 min", summary: "Proteína con una guarnición fresca.", kcal: 560, protein: 52 },
  { title: "Tortilla de papa y cebolla", meals: ["alm", "cen"], regions: ["rioplatense", "global"], cuisine: "mediterraneo", tags: ["mediterraneo"], ingredients: [{ name: "papa", quantity: 3, unit: "u." }, { name: "huevo", quantity: 4, unit: "u." }, { name: "cebolla", quantity: 1, unit: "u." }], time: "30 min", summary: "Casera, económica y saciante.", kcal: 610, protein: 25 },
  { title: "Guiso de lentejas con verduras", meals: ["alm", "cen"], regions: ["rioplatense", "global"], cuisine: "argentina", tags: ["argentina", "saludable"], ingredients: [{ name: "lentejas", quantity: 100, unit: "g" }, { name: "papa", quantity: 1, unit: "u." }, { name: "zanahoria", quantity: 1, unit: "u." }, { name: "tomate", quantity: 1, unit: "u." }, { name: "cebolla", quantity: 1, unit: "u." }], time: "40 min", summary: "Plato de olla con mucha saciedad.", kcal: 540, protein: 29 },
  { title: "Polenta con salsa de tomate", meals: ["alm", "cen"], regions: ["rioplatense", "global"], cuisine: "italiano", tags: ["italiano"], ingredients: [{ name: "polenta", quantity: 100, unit: "g" }, { name: "tomate", quantity: 2, unit: "u." }, { name: "queso", quantity: 40, unit: "g" }], time: "25 min", summary: "Reconfortante y económica.", kcal: 520, protein: 17 },
  { title: "Ñoquis con salsa fileto", meals: ["alm", "cen"], regions: ["global"], cuisine: "italiano", tags: ["italiano"], ingredients: [{ name: "ñoquis", quantity: 300, unit: "g" }, { name: "tomate", quantity: 2, unit: "u." }, { name: "queso", quantity: 30, unit: "g" }], time: "20 min", summary: "Pasta rápida con salsa casera.", kcal: 650, protein: 20 },
  { title: "Arroz primavera con pollo", meals: ["alm", "cen"], regions: ["global"], cuisine: "asiatico", tags: ["asiatico", "saludable"], ingredients: [{ name: "arroz", quantity: 80, unit: "g" }, { name: "pollo", quantity: 200, unit: "g" }, { name: "zanahoria", quantity: 1, unit: "u." }, { name: "huevo", quantity: 1, unit: "u." }], time: "25 min", summary: "Completo y fácil de adaptar.", kcal: 590, protein: 42 },
  { title: "Wok de verduras con arroz", meals: ["alm", "cen"], regions: ["global"], cuisine: "asiatico", tags: ["asiatico", "saludable"], ingredients: [{ name: "arroz", quantity: 80, unit: "g" }, { name: "zanahoria", quantity: 1, unit: "u." }, { name: "cebolla", quantity: 1, unit: "u." }, { name: "pimiento", quantity: 1, unit: "u." }, { name: "salsa de soja", quantity: 15, unit: "ml" }], time: "20 min", summary: "Mucho volumen y pocos pasos.", kcal: 430, protein: 12 },
  { title: "Tacos de carne y tomate", meals: ["alm", "cen"], regions: ["global"], cuisine: "mexicano", tags: ["mexicano"], ingredients: [{ name: "carne", quantity: 180, unit: "g" }, { name: "tortilla", quantity: 2, unit: "u." }, { name: "tomate", quantity: 1, unit: "u." }, { name: "cebolla", quantity: 1, unit: "u." }], time: "20 min", summary: "Sabrosos y rápidos para resolver una comida.", kcal: 590, protein: 37 },
  { title: "Quesadillas de pollo", meals: ["alm", "cen"], regions: ["global"], cuisine: "mexicano", tags: ["mexicano", "rapida"], ingredients: [{ name: "pollo", quantity: 180, unit: "g" }, { name: "tortilla", quantity: 2, unit: "u." }, { name: "queso", quantity: 60, unit: "g" }], time: "15 min", summary: "Crujientes, simples y con buena proteína.", kcal: 560, protein: 42 },
  { title: "Ensalada completa con huevo", meals: ["alm", "cen"], regions: ["global"], cuisine: "saludable", tags: ["saludable", "rapida"], ingredients: [{ name: "huevo", quantity: 2, unit: "u." }, { name: "tomate", quantity: 1, unit: "u." }, { name: "zanahoria", quantity: 1, unit: "u." }, { name: "queso", quantity: 30, unit: "g" }], time: "12 min", summary: "Liviana, práctica y con proteína.", kcal: 340, protein: 24 },
  { title: "Pasta cremosa con pollo", meals: ["alm", "cen"], regions: ["global"], cuisine: "italiano", tags: ["italiano"], ingredients: [{ name: "pasta", quantity: 100, unit: "g" }, { name: "pollo", quantity: 180, unit: "g" }, { name: "leche", quantity: 100, unit: "ml" }, { name: "queso", quantity: 30, unit: "g" }], time: "25 min", summary: "Plato completo para los días de más hambre.", kcal: 690, protein: 44 },
];

const ALL_RECIPES = [...RECIPES, ...EXTRA_RECIPES];

export function RecipePlanner({ items, consumeAmounts, onUseRecipe, dailyGoal, consumedKcal }: { items: InventoryItem[]; consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void; onUseRecipe: (recipe: (typeof RECIPES)[number], meal: MealKey) => void; dailyGoal: number; consumedKcal: number }) {
  const [selectedFilters, setSelectedFilters] = useState<Cuisine[]>(["saludable", "rapida"]);
  const [selectedRecipe, setSelectedRecipe] = useState<(typeof RECIPES)[number] | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealKey | null>("des");
  const [region, setRegion] = useState<Region>("global");
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showExtraSuggestions, setShowExtraSuggestions] = useState(false);

  useEffect(() => {
    const language = navigator.language.toLowerCase();
    if (language === "es-ar" || language === "es-uy") setRegion("rioplatense");
  }, []);

  useEffect(() => {
    setLoadingSuggestions(true);
    setShowExtraSuggestions(false);
    const timer = window.setTimeout(() => setLoadingSuggestions(false), 450);
    return () => window.clearTimeout(timer);
  }, [selectedMeal, selectedFilters, region, items]);

  const toggleFilter = (id: Cuisine) => {
    setSelectedFilters((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const inventorySuggestions = useMemo(() => {
    if (!selectedMeal) return [];
    return INVENTORY_RECIPES.filter((recipe) => recipe.meals.includes(selectedMeal) && recipe.ingredients.every((ingredient) =>
      items.some((item) => item.unit === ingredient.unit && (item.name.includes(ingredient.name) || ingredient.name.includes(item.name)) && item.quantity >= ingredient.quantity)
    )).slice(0, 3);
  }, [items, selectedMeal]);

  const extraSuggestions = useMemo(() => {
    const available = items.map((item) => item.name.toLowerCase());
    const selectedCuisines = selectedFilters.filter((filter) => !PREFERENCE_FILTERS.includes(filter));
    const selectedPreferences = selectedFilters.filter((filter) => PREFERENCE_FILTERS.includes(filter));
    const cuisineRecipes = ALL_RECIPES.filter((recipe) =>
      (!selectedMeal || recipe.meals.includes(selectedMeal)) &&
      (!selectedCuisines.length || selectedCuisines.includes(recipe.cuisine))
    );
    const ingredientFrequency = cuisineRecipes.reduce<Record<string, number>>((frequency, recipe) => {
      recipe.ingredients.forEach((ingredient) => {
        const name = ingredient.name.toLowerCase();
        frequency[name] = (frequency[name] || 0) + 1;
      });
      return frequency;
    }, {});

    const matchesSegment = (recipe: (typeof RECIPES)[number]) => {
      if (!selectedMeal || !recipe.meals.includes(selectedMeal)) return false;
      if (!selectedCuisines.length && !recipe.regions.includes(region) && !recipe.regions.includes("global")) return false;
      if (selectedCuisines.length > 0 && !selectedCuisines.includes(recipe.cuisine)) return false;
      return true;
    };

    const matchesPreferences = (recipe: (typeof RECIPES)[number]) => {
      if (selectedPreferences.length > 0 && !selectedPreferences.some((filter) => recipe.tags.includes(filter))) {
        return false;
      }
      return true;
    };

    const rankRecipes = (recipes: typeof RECIPES) => recipes.sort((first, second) => {
      const sharedIngredients = (recipe: (typeof RECIPES)[number]) => recipe.ingredients.reduce(
        (total, ingredient) => total + (ingredientFrequency[ingredient.name.toLowerCase()] > 1 ? 1 : 0),
        0
      );
      const missingIngredients = (recipe: (typeof RECIPES)[number]) => recipe.ingredients.filter(
        (ingredient) => !available.some((item) => item.includes(ingredient.name) || ingredient.name.includes(item))
      ).length;
      if (selectedCuisines.length > 1 && sharedIngredients(first) !== sharedIngredients(second)) {
        return sharedIngredients(second) - sharedIngredients(first);
      }
      return missingIngredients(first) - missingIngredients(second);
    });

    const preferred = ALL_RECIPES.filter((recipe) => {
      return matchesSegment(recipe) && matchesPreferences(recipe);
    });
    const sameCuisine = ALL_RECIPES.filter(matchesSegment);
    const sameSegment = ALL_RECIPES.filter((recipe) => {
      if (!selectedMeal || !recipe.meals.includes(selectedMeal)) return false;
      return recipe.regions.includes(region) || recipe.regions.includes("global");
    });
    return [...rankRecipes(preferred), ...rankRecipes(sameCuisine), ...rankRecipes(sameSegment)]
      .filter((recipe, index, all) => all.findIndex((candidate) => candidate.title === recipe.title) === index)
      .slice(0, 3);
  }, [items, selectedFilters, selectedMeal, region]);

  const remainingKcal = Math.max(0, dailyGoal - consumedKcal);
  const portionAdvice = (recipe: PlannerRecipe) => {
    if (remainingKcal <= 0) return "Objetivo alcanzado; elegí media porción si todavía tenés hambre.";
    const portions = Math.min(2, Math.max(0.5, Math.floor((remainingKcal / recipe.kcal) * 2) / 2));
    const portionLabel = portions === 0.5 ? "media porción" : `${portions} ${portions === 1 ? "porción" : "porciones"}`;
    return `Para tu margen actual: ${portionLabel} · aprox. ${Math.round(recipe.kcal * portions)} kcal`;
  };

  const getRecipeLines = (recipe: (typeof RECIPES)[number]) => recipe.ingredients.map((ingredient) => {
    const item = items.find((candidate) => candidate.unit === ingredient.unit && (candidate.name.includes(ingredient.name) || ingredient.name.includes(candidate.name)));
    return { ingredient, item, used: item ? Math.min(item.quantity, ingredient.quantity) : 0 };
  });

  const confirmRecipe = () => {
    if (!selectedRecipe || !selectedMeal) return;
    const lines = getRecipeLines(selectedRecipe);
    if (lines.some((line) => !line.item || line.item.quantity < line.ingredient.quantity)) return;
    consumeAmounts(lines.map((line) => ({ id: line.item!.id, quantity: line.ingredient.quantity })));
    onUseRecipe(selectedRecipe, selectedMeal);
    setSelectedRecipe(null);
  };

  return (
    <div className="mb-5 rounded-2xl border border-border bg-surface/70 p-3 shadow-[0_0_0_1px_rgba(58,54,47,0.4)]">
      <button type="button" onClick={() => setExpanded((current) => !current)} className="flex w-full items-center justify-between gap-2 text-left">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Recetas</div>
          <div className="font-display text-xl leading-none -tracking-[0.04em]">Planner de cocina</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
            {inventorySuggestions.length} disponibles
          </div>
          <span className="text-textMuted" aria-hidden="true">{expanded ? "−" : "+"}</span>
        </div>
      </button>

      {expanded && <div className="mt-3">
      <div className="mb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted mb-2">Tipos de cocina</div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = selectedFilters.includes(filter.id);
            return (
              <button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                disabled={loadingSuggestions}
                title={!active && selectedFilters.length >= 3 ? "Podés elegir hasta 3 filtros" : undefined}
                className={`rounded-full border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                  active ? "border-gold bg-gold text-bg" : "border-border bg-bg/60 text-textMuted"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-gold/30 bg-gold/10 p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold mb-2">¿Para qué comida buscás?</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MEAL_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedMeal(key as MealKey)}
              disabled={loadingSuggestions}
              className={`rounded-lg border px-2 py-2 text-[11px] font-semibold ${selectedMeal === key ? "border-gold bg-gold text-bg" : "border-border bg-bg/60 text-textMuted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted mb-2">Heladera / alacena</div>
        <div className="grid grid-cols-2 gap-2">
          {items.length > 0 ? items.map((item) => (
            <div key={item.id} className="rounded-xl border border-sage/60 bg-sage/10 px-2 py-2 text-left font-mono text-[11px] text-text">
              {item.name} <span className="text-gold">× {item.quantity} {inventoryUnitLabel(item.name, item.unit)}</span>
            </div>
          )) : <div className="col-span-2 rounded-xl border border-dashed border-border p-3 text-[11px] text-textMuted">Cargá productos desde Compras para activar sugerencias reales.</div>}
        </div>
      </div>

      {selectedMeal ? <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted mb-2">Con lo que tenés</div>
        <div className="mb-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 font-mono text-[10px] text-gold">
          Hoy llevás {consumedKcal.toLocaleString("es-AR")} de {dailyGoal.toLocaleString("es-AR")} kcal · te quedan {remainingKcal.toLocaleString("es-AR")} kcal
        </div>
        <div className="space-y-2">
          {loadingSuggestions ? (
            <div className="space-y-2" aria-live="polite" aria-busy="true">
              {[1, 2, 3].map((placeholder) => (
                <div key={placeholder} className="animate-pulse rounded-xl border border-border bg-bg/40 p-3">
                  <div className="h-4 w-2/3 rounded bg-surfaceAlt" />
                  <div className="mt-3 h-3 w-full rounded bg-surfaceAlt/80" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-surfaceAlt/80" />
                </div>
              ))}
              <div className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-gold">Buscando opciones...</div>
            </div>
          ) : inventorySuggestions.length > 0 ? (
            inventorySuggestions.map((recipe) => (
              <div key={recipe.title} className="rounded-xl border border-border bg-bg/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{recipe.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold">{recipe.time}</div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {recipe.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.10em] text-textMuted">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-gold/20 bg-gold/10 p-2">
                  <div><div className="font-mono text-[9px] uppercase text-textMuted">Aporte energético</div><div className="font-mono text-sm text-gold">{recipe.kcal} kcal</div></div>
                  <div><div className="font-mono text-[9px] uppercase text-textMuted">Proteína</div><div className="font-mono text-sm text-sage">{recipe.protein} g</div></div>
                </div>
                <div className="mt-2 text-[12px] text-textMuted">{recipe.summary}</div>
                <div className="mt-2 rounded-lg border border-sage/30 bg-sage/10 px-2 py-2 font-mono text-[10px] text-sage">{portionAdvice(recipe)}</div>
                <button
                  type="button"
                  onClick={() => setSelectedRecipe(recipe)}
                  className="mt-2 rounded-lg border border-sage/50 bg-sage/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-sage"
                >
                  Ver consumo y preparar
                </button>
              </div>
            ))
          ) : <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">No hay una receta completa con el inventario actual.</div>}
        </div>
        {!loadingSuggestions && (
          <>
            <button
              type="button"
              onClick={() => setShowExtraSuggestions((current) => !current)}
              className="mt-3 w-full rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-gold"
            >
              {showExtraSuggestions ? "Ocultar sugerencias extras" : "Sugerencias extras"}
            </button>
            {showExtraSuggestions && (
              <div className="mt-3 space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted">También podés hacer</div>
                {extraSuggestions.map((recipe) => (
                  <div key={`extra-${recipe.title}`} className="rounded-xl border border-border bg-bg/40 p-2.5">
                    <div className="flex items-center justify-between gap-2"><div className="font-semibold text-sm">{recipe.title}</div><div className="font-mono text-[10px] text-gold">{recipe.time}</div></div>
                    <div className="mt-1 text-[12px] text-textMuted">{recipe.summary}</div>
                    <div className="mt-2 rounded-lg border border-sage/30 bg-sage/10 px-2 py-2 font-mono text-[10px] text-sage">{portionAdvice(recipe)}</div>
                    <button type="button" onClick={() => setSelectedRecipe(recipe)} className="mt-2 rounded-lg border border-sage/50 bg-sage/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-sage">Ver consumo y preparar</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div> : <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">Elegí primero desayuno, almuerzo, merienda o cena para ver sugerencias.</div>}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setSelectedRecipe(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="font-display text-xl text-text">{selectedRecipe.title}</div>
            <div className="mt-1 text-[11px] text-textMuted">Una porción. Revisá el inventario antes de descontar.</div>
            <label className="mt-3 block">¿Para qué comida?</label>
            <select value={selectedMeal || ""} onChange={(event) => setSelectedMeal(event.target.value as MealKey)} className="mt-1 w-full">
              {Object.entries(MEAL_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <div className="mt-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] text-textMuted">
              Se cargará como {selectedMeal ? MEAL_LABELS[selectedMeal].toLowerCase() : "comida seleccionada"}: {selectedRecipe.kcal} kcal y {selectedRecipe.protein} g de proteína.
            </div>
            <div className="mt-3 space-y-2">
              {getRecipeLines(selectedRecipe).map(({ ingredient, item, used }) => (
                <div key={ingredient.name} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 p-2 text-[11px]">
                  <span className="text-text">{ingredient.name}: {ingredient.quantity} {ingredient.unit}</span>
                  <span className={item && item.quantity >= ingredient.quantity ? "text-sage" : "text-rust"}>
                    {item ? `${item.quantity} -> ${Math.max(0, item.quantity - used)} ${item.unit}` : "faltante"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSelectedRecipe(null)} className="rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted">Cancelar</button>
              <button
                type="button"
                onClick={confirmRecipe}
                disabled={getRecipeLines(selectedRecipe).some((line) => !line.item || line.item.quantity < line.ingredient.quantity)}
                className="rounded-lg border border-sage/50 bg-sage/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-sage disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirmar consumo
              </button>
            </div>
          </div>
        </div>
      )}
      </div>}
    </div>
  );
}
