// Planes nutricionales reales:
//  · Flavia (flaviabravo61): conserva INTACTO el menú de su nutricionista como opción A (nivel "buena") y le suma
//    2 opciones por comida con las mismas kcal: una "perfecta" (violeta, más proteína/calidad) y una "ocasional"
//    (amarilla, más grasa / menos proteína). Todas con ingredientes y cantidades (lista de compras, descuento de Alacena).
//    Semana 28/9 (la que ya tenía) y semana 5/10 (para probar el flujo de la semana que viene).
//  · jgabrielrosa8: las MISMAS comidas de Flavia, en mayor cantidad (~2.100 kcal y >= 140 g de proteína por día).
//    Reemplaza los planes de las semanas 28/9 y 5/10 de esa cuenta.
// Idempotente. Uso: node scripts/seed-planes-reales.mjs
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
async function api(path, method = "GET", body) {
  const res = await fetch(U + path, { method, headers: H, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${t}`);
  return t ? JSON.parse(t) : null;
}

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const MEALS = ["des", "mer", "alm", "cen", "col"];
const ing = (list) => list.map(([name, quantity, unit]) => ({ name, quantity, unit }));

// ---------- El menú real de la nutricionista: nombre (inicio) -> nombre corto + ingredientes ----------
const BASE = [
  ["2 tostadas integrales (50 g), 1 huevo + 2 claras revueltos", "Tostadas integrales con huevo revuelto y mandarina", [["Pan integral (2 tostadas)", 50, "g"], ["Huevo", 1, "u."], ["Claras", 2, "u."], ["Mandarina", 1, "u."]]],
  ["Yogur descremado con 1 banana pequeña", "Yogur descremado con banana", [["Yogur descremado", 170, "g"], ["Banana pequeña", 1, "u."]]],
  ["Pechuga de pollo a la plancha (130 g)", "Pechuga de pollo a la plancha con arroz y ensalada", [["Pechuga de pollo", 130, "g"], ["Arroz cocido", 120, "g"], ["Tomate", 60, "g"], ["Zanahoria", 40, "g"], ["Lechuga", 50, "g"], ["Aceite de oliva", 5, "ml"], ["Fruta", 1, "u."]]],
  ["Merluza al horno (160 g), papa al horno (180 g)", "Merluza al horno con papa y ensalada", [["Merluza", 160, "g"], ["Papa", 180, "g"], ["Hojas verdes", 80, "g"], ["Tomate", 80, "g"], ["Aceite de oliva", 5, "ml"]]],
  ["Yogur griego descremado (170 g) con 10 g de nueces", "Yogur griego con nueces", [["Yogur griego descremado", 170, "g"], ["Nueces", 10, "g"]]],
  ["Avena (35 g) cocida con leche", "Avena cocida con leche, banana y chía", [["Avena", 35, "g"], ["Leche descremada", 150, "ml"], ["Banana", 0.5, "u."], ["Semillas de chía", 5, "g"]]],
  ["2 tostadas integrales con 40 g de queso untable", "Tostadas integrales con queso untable", [["Pan integral (2 tostadas)", 50, "g"], ["Queso untable descremado", 40, "g"]]],
  ["Carne vacuna magra (130 g), puré de calabaza y papa", "Carne magra con puré de calabaza y papa", [["Carne vacuna magra", 130, "g"], ["Puré de calabaza y papa", 220, "g"], ["Tomate", 60, "g"], ["Rúcula", 40, "g"], ["Aceite de oliva", 5, "ml"], ["Fruta", 1, "u."]]],
  ["Omelette de 2 huevos + 2 claras con espinaca y cebolla", "Omelette con espinaca, batata y ensalada", [["Huevo", 2, "u."], ["Claras", 2, "u."], ["Espinaca", 60, "g"], ["Cebolla", 30, "g"], ["Batata", 150, "g"], ["Tomate", 60, "g"], ["Pepino", 60, "g"]]],
  ["1 manzana y 10 g de almendras", "Manzana con almendras", [["Manzana", 1, "u."], ["Almendras", 10, "g"]]],
  ["2 tostadas integrales, 60 g de queso fresco", "Tostadas con queso fresco y kiwi", [["Pan integral (2 tostadas)", 50, "g"], ["Queso fresco descremado", 60, "g"], ["Kiwi", 1, "u."]]],
  ["Licuado de leche descremada (200 ml)", "Licuado de leche con banana y cacao", [["Leche descremada", 200, "ml"], ["Banana", 0.5, "u."], ["Cacao amargo", 8, "g"], ["Avena", 10, "g"]]],
  ["Pollo salteado (130 g) con fideos integrales", "Pollo salteado con fideos integrales y verduras", [["Pollo", 130, "g"], ["Fideos integrales cocidos", 120, "g"], ["Morrón", 50, "g"], ["Zucchini", 80, "g"], ["Cebolla", 40, "g"], ["Aceite de oliva", 5, "ml"]]],
  ["Hamburguesa casera de carne magra (140 g)", "Hamburguesa casera con papa y ensalada", [["Carne magra picada", 140, "g"], ["Papa al horno", 150, "g"], ["Verduras variadas", 200, "g"]]],
  ["Yogur descremado (170 g) con 1 fruta pequeña", "Yogur descremado con fruta", [["Yogur descremado", 170, "g"], ["Fruta pequeña", 1, "u."]]],
  ["2 tostadas integrales, 1 huevo revuelto, 40 g de palta", "Tostadas con huevo, palta y naranja", [["Pan integral (2 tostadas)", 50, "g"], ["Huevo", 1, "u."], ["Palta", 40, "g"], ["Naranja", 1, "u."]]],
  ["2 galletas de arroz con 50 g de queso untable", "Galletas de arroz con queso untable y fruta", [["Galletas de arroz", 2, "u."], ["Queso untable descremado", 50, "g"], ["Fruta pequeña", 1, "u."]]],
  ["Pescado al horno (150 g), arroz cocido (120 g)", "Pescado al horno con arroz y ensalada", [["Pescado blanco", 150, "g"], ["Arroz cocido", 120, "g"], ["Tomate", 60, "g"], ["Zanahoria", 40, "g"], ["Hojas verdes", 50, "g"], ["Aceite de oliva", 5, "ml"], ["Fruta", 1, "u."]]],
  ["Pollo al horno (140 g), calabaza asada (200 g)", "Pollo al horno con calabaza y ensalada", [["Pollo al horno", 140, "g"], ["Calabaza asada", 200, "g"], ["Hojas verdes", 80, "g"], ["Tomate", 60, "g"], ["Aceite de oliva", 5, "ml"]]],
  ["Yogur griego descremado con 10 g de nueces", "Yogur griego con nueces", [["Yogur griego descremado", 170, "g"], ["Nueces", 10, "g"]]],
  ["Yogur griego descremado (200 g), avena (30 g)", "Yogur griego con avena, frutillas y nueces", [["Yogur griego descremado", 200, "g"], ["Avena", 30, "g"], ["Frutillas o arándanos", 100, "g"], ["Nueces", 10, "g"]]],
  ["2 tostadas integrales con 40 g de queso fresco", "Tostadas integrales con queso fresco", [["Pan integral (2 tostadas)", 50, "g"], ["Queso fresco descremado", 40, "g"]]],
  ["Carne magra (130 g), papa hervida o al horno (180 g)", "Carne magra con papa y ensalada", [["Carne vacuna magra", 130, "g"], ["Papa", 180, "g"], ["Ensalada abundante", 200, "g"], ["Aceite de oliva", 5, "ml"], ["Fruta", 1, "u."]]],
  ["Omelette de 2 huevos + 2 claras con verduras salteadas", "Omelette con verduras, batata y ensalada", [["Huevo", 2, "u."], ["Claras", 2, "u."], ["Verduras salteadas", 150, "g"], ["Batata", 150, "g"], ["Ensalada fresca", 100, "g"]]],
  ["1 banana pequeña con 1 cdita. de mantequilla de maní", "Banana con mantequilla de maní", [["Banana pequeña", 1, "u."], ["Mantequilla de maní", 10, "g"]]],
  ["2 tostadas integrales, 1 huevo + 2 claras, 1 cdita. de queso untable", "Tostadas con huevo, claras y queso untable", [["Pan integral (2 tostadas)", 50, "g"], ["Huevo", 1, "u."], ["Claras", 2, "u."], ["Queso untable descremado", 10, "g"], ["Fruta", 1, "u."]]],
  ["Yogur griego con 1 banana pequeña y canela", "Yogur griego con banana y canela", [["Yogur griego descremado", 170, "g"], ["Banana pequeña", 1, "u."]]],
  ["Pollo al horno (150 g), batata (180 g)", "Pollo al horno con batata y ensalada", [["Pollo al horno", 150, "g"], ["Batata", 180, "g"], ["Tomate", 60, "g"], ["Lechuga", 50, "g"], ["Zanahoria", 40, "g"], ["Aceite de oliva", 5, "ml"], ["Fruta", 1, "u."]]],
  ["Merluza o pescado blanco (150 g), puré de calabaza", "Merluza con puré de calabaza y ensalada", [["Merluza o pescado blanco", 150, "g"], ["Puré de calabaza", 200, "g"], ["Verduras para ensalada", 150, "g"], ["Aceite de oliva", 5, "ml"]]],
  ["Yogur descremado con 10 g de almendras", "Yogur descremado con almendras", [["Yogur descremado", 170, "g"], ["Almendras", 10, "g"]]],
  ["Pan integral (50 g), 1 huevo + 2 claras, 40 g de palta", "Pan integral con huevo, claras y palta", [["Pan integral", 50, "g"], ["Huevo", 1, "u."], ["Claras", 2, "u."], ["Palta", 40, "g"], ["Fruta", 1, "u."]]],
  ["Carne vacuna magra al horno o a la parrilla (150 g)", "Carne magra con papa o batata y ensalada", [["Carne vacuna magra", 150, "g"], ["Papa o batata", 180, "g"], ["Ensalada variada", 250, "g"], ["Aceite de oliva", 5, "ml"], ["Fruta", 1, "u."]]],
  ["Ensalada completa con pollo grillado (130 g)", "Ensalada completa con pollo grillado", [["Pollo grillado", 130, "g"], ["Lechuga, tomate, zanahoria, pepino y morrón", 300, "g"], ["Huevo", 0.5, "u."], ["Papa", 100, "g"], ["Aceite de oliva", 5, "ml"]]],
  ["Yogur descremado con 10 g de nueces", "Yogur descremado con nueces", [["Yogur descremado", 170, "g"], ["Nueces", 10, "g"]]],
];

// ---------- Alternativas con las MISMAS kcal que el menú (des 300 · mer 200 · alm 450 · cen 400 · col 150) ----------
// [nombre, kcal, proteína, carbos, grasas, explicación, ingredientes]
const LIB = {
  des: {
    optima: [
      ["Licuado proteico de leche, proteína y banana", 300, 27, 32, 6, "Más proteína con las mismas calorías.", [["Leche descremada", 250, "ml"], ["Proteína en polvo", 25, "g"], ["Banana", 0.5, "u."]]],
      ["Panqueques de avena y claras con frutos rojos", 300, 24, 38, 6, "Saciante, con fibra y mucha proteína.", [["Avena", 40, "g"], ["Claras", 3, "u."], ["Frutos rojos", 80, "g"], ["Canela", 1, "g"]]],
      ["Tostada integral con ricota, huevo y tomate", 300, 22, 28, 10, "Equilibrado, con grasas buenas.", [["Pan integral (1 tostada)", 40, "g"], ["Ricota descremada", 60, "g"], ["Huevo", 1, "u."], ["Tomate", 60, "g"]]],
    ],
    ocasional: [
      ["Medialuna con café con leche", 300, 9, 38, 12, "De vez en cuando: más grasa y menos proteína.", [["Medialuna", 1, "u."], ["Café con leche descremada", 200, "ml"]]],
      ["Tostadas de pan blanco con dulce de leche", 300, 7, 52, 6, "Ocasional: harina refinada y azúcar.", [["Pan blanco (2 tostadas)", 50, "g"], ["Dulce de leche", 20, "g"], ["Mate cocido", 200, "ml"]]],
      ["Yogur bebible entero con cereales azucarados", 300, 7, 50, 7, "Ocasional: azúcar agregada y poca proteína.", [["Yogur bebible entero", 200, "ml"], ["Cereales azucarados", 30, "g"]]],
    ],
  },
  mer: {
    optima: [
      ["Yogur griego con fruta y canela", 200, 15, 22, 4, "Proteína y calcio.", [["Yogur griego descremado", 150, "g"], ["Fruta pequeña", 1, "u."], ["Canela", 1, "g"]]],
      ["Licuado de frutilla con leche y proteína", 200, 19, 22, 2, "Fresco y con mucha proteína.", [["Leche descremada", 200, "ml"], ["Frutillas", 100, "g"], ["Proteína en polvo", 10, "g"]]],
      ["Queso cottage con durazno", 200, 15, 20, 5, "Liviano y saciante.", [["Queso cottage", 100, "g"], ["Durazno", 1, "u."]]],
    ],
    ocasional: [
      ["Galletitas dulces rellenas con café con leche", 200, 4, 30, 8, "Ocasional: azúcar y grasa.", [["Galletitas rellenas", 3, "u."], ["Café con leche descremada", 150, "ml"]]],
      ["Alfajor de maicena", 200, 3, 30, 9, "Ocasional: poco valor nutricional.", [["Alfajor de maicena", 1, "u."]]],
      ["Barra de cereal con chocolate", 200, 3, 32, 7, "Ocasional: azúcar agregada.", [["Barra de cereal", 1, "u."], ["Té", 200, "ml"]]],
    ],
  },
  alm: {
    optima: [
      ["Pechuga de pollo con quinoa y brócoli", 450, 46, 38, 11, "Proteína magra y carbohidrato complejo.", [["Pechuga de pollo", 150, "g"], ["Quinoa cocida", 100, "g"], ["Brócoli al vapor", 150, "g"], ["Aceite de oliva", 5, "ml"]]],
      ["Milanesa de pollo al horno con puré de calabaza", 450, 38, 40, 12, "Horneada, sin fritura.", [["Milanesa de pollo al horno", 130, "g"], ["Puré de calabaza", 200, "g"], ["Ensalada verde", 100, "g"]]],
      ["Lentejas con arroz integral y ensalada", 450, 28, 66, 7, "Opción vegetal con mucha fibra.", [["Lentejas cocidas", 200, "g"], ["Arroz integral cocido", 60, "g"], ["Ensalada", 100, "g"], ["Aceite de oliva", 5, "ml"]]],
    ],
    ocasional: [
      ["Milanesa napolitana chica con papas fritas", 450, 30, 40, 19, "Ocasional: frita y más grasa.", [["Milanesa napolitana", 120, "g"], ["Papas fritas", 100, "g"]]],
      ["Fideos con salsa y queso rallado", 450, 16, 72, 10, "Ocasional: muchos carbohidratos, poca proteína.", [["Fideos cocidos", 250, "g"], ["Salsa de tomate", 100, "g"], ["Queso rallado", 15, "g"]]],
      ["Hamburguesa con pan y papas fritas", 450, 24, 42, 20, "Ocasional: más grasa por porción.", [["Hamburguesa con pan", 1, "u."], ["Papas fritas", 80, "g"]]],
    ],
  },
  cen: {
    optima: [
      ["Merluza grillada con vegetales al horno", 400, 42, 24, 14, "Cena liviana y alta en proteína.", [["Merluza", 180, "g"], ["Vegetales al horno", 250, "g"], ["Aceite de oliva", 5, "ml"]]],
      ["Wok de pollo con vegetales y fideos de arroz", 400, 38, 36, 10, "Mucho volumen, pocas calorías.", [["Pollo", 130, "g"], ["Vegetales salteados", 250, "g"], ["Fideos de arroz", 40, "g"], ["Salsa de soja", 10, "ml"]]],
      ["Tortilla de claras con espinaca y papa al horno", 400, 32, 30, 15, "Liviana y completa.", [["Huevo", 1, "u."], ["Claras", 3, "u."], ["Espinaca", 60, "g"], ["Papa al horno", 100, "g"], ["Aceite de oliva", 5, "ml"]]],
    ],
    ocasional: [
      ["Pizza de muzzarella (2 porciones)", 400, 17, 46, 16, "Ocasional: menos proteína y más grasa.", [["Pizza de muzzarella", 2, "u."]]],
      ["Empanadas de carne al horno (3)", 400, 18, 40, 18, "Ocasional: masa y grasa.", [["Empanadas de carne al horno", 3, "u."]]],
      ["Tarta de jamón y queso", 400, 16, 30, 24, "Ocasional: alta en grasa.", [["Tarta de jamón y queso", 1, "u."]]],
    ],
  },
  col: {
    optima: [
      ["Yogur proteico", 150, 18, 8, 3, "Mucha proteína por caloría.", [["Yogur proteico", 150, "g"]]],
      ["Huevo duro con claras y tomate", 150, 17, 3, 8, "Colación proteica.", [["Huevo duro", 1, "u."], ["Claras", 2, "u."], ["Tomate", 60, "g"]]],
      ["Queso cottage con almendras", 150, 14, 5, 8, "Proteína y grasas buenas.", [["Queso cottage", 100, "g"], ["Almendras", 5, "g"]]],
    ],
    ocasional: [
      ["Chocolate semiamargo", 150, 2, 12, 10, "Ocasional: grasa y azúcar.", [["Chocolate semiamargo", 25, "g"]]],
      ["Papas fritas de bolsa", 150, 2, 14, 10, "Ocasional: ultraprocesado.", [["Papas fritas de bolsa", 25, "g"]]],
      ["Alfajor chico", 150, 2, 20, 7, "Ocasional: azúcar.", [["Alfajor chico", 1, "u."]]],
    ],
  },
};

const libOption = (entry, nivel) => {
  const [nombre, kcal, protein, carbs, fat, explicacion, ings] = entry;
  return { nombre, kcal, protein, carbs, fat, explicacion, nivel, ingredientes: ing(ings) };
};

// Día de la semana del plan original de Flavia -> 3 opciones por comida
function threeOptions(original, dayIdx, rotation) {
  const out = {};
  for (const [mi, meal] of MEALS.entries()) {
    const a = original[meal]?.[0];
    if (!a) continue;
    const base = BASE.find(([start]) => a.nombre.startsWith(start));
    if (!base) throw new Error(`Falta cocinar ingredientes de: ${a.nombre}`);
    const optionA = { ...a, nivel: "buena", explicacion: a.explicacion || "El plato de tu nutricionista.", ingredientes: ing(base[2]), _short: base[1] };
    const b = libOption(LIB[meal].optima[(dayIdx + mi + rotation) % 3], "optima");
    const c = libOption(LIB[meal].ocasional[(dayIdx + mi + rotation) % 3], "ocasional");
    out[meal] = [optionA, b, c];
  }
  return out;
}

const clean = (opts) => opts.map(({ _short, ...rest }) => rest);

// ---------- Escalado para jgabrielrosa8 ----------
const KCAL_TARGET = 2100;
const PROTEIN_TARGET = 140;
const roundQty = (q, unit) => (unit === "u." ? Math.round(q * 2) / 2 : Math.max(unit === "ml" ? 5 : 5, Math.round(q / 5) * 5));
function scaleOption(opt, f, useShortName) {
  return {
    nombre: useShortName && opt._short ? opt._short : opt.nombre,
    kcal: Math.round(opt.kcal * f),
    protein: Math.round(opt.protein * f),
    carbs: Math.round(opt.carbs * f),
    fat: Math.round(opt.fat * f),
    explicacion: opt.explicacion,
    nivel: opt.nivel,
    ingredientes: opt.ingredientes.map((i) => ({ name: i.name, unit: i.unit, quantity: roundQty(i.quantity * f, i.unit) })),
  };
}

function scaledDay(day) {
  // kcal de la opción A por día = 1500 -> factor 1.4; si la proteína no llega, sube primero la "perfecta" (más proteína) en las comidas donde más suma.
  const order = Object.fromEntries(MEALS.filter((m) => day[m]).map((m) => [m, [...day[m]]]));
  let protein = (m) => order[m][0].protein;
  let total = () => Object.keys(order).reduce((s, m) => s + protein(m), 0);
  const kcalA = Object.keys(order).reduce((s, m) => s + order[m][0].kcal, 0);
  const f = KCAL_TARGET / kcalA;
  const gains = Object.keys(order)
    .map((m) => ({ m, gain: (order[m][1].protein - order[m][0].protein) }))
    .sort((x, y) => y.gain - x.gain);
  for (const { m, gain } of gains) {
    if (total() * f >= PROTEIN_TARGET) break;
    if (gain > 0) order[m] = [order[m][1], order[m][0], order[m][2]]; // la perfecta pasa a ser la primera
  }
  const scaled = {};
  for (const m of Object.keys(order)) scaled[m] = order[m].map((o) => scaleOption(o, f, true));
  return scaled;
}

// ---------- Aplicar ----------
const users = (await api("/auth/v1/admin/users?per_page=1000")).users;
const flavia = users.find((u) => u.email === "flaviabravo61@gmail.com").id;
const yo = users.find((u) => u.email === "jgabrielrosa8@gmail.com").id;

const [flaviaPlan] = await api(`/rest/v1/training_plans?select=*&student_id=eq.${flavia}&disciplina=eq.nutricion&week_start=eq.2026-09-28`);
if (!flaviaPlan) throw new Error("Flavia no tiene plan de nutrición para 2026-09-28");
// El menú ORIGINAL de la nutricionista: si ya se corrió este script, la opción A de cada comida sigue siendo la original.
const original = flaviaPlan.days;

function buildDays(rotation) {
  const days = {};
  DIAS.forEach((d, i) => {
    if (original[d]) days[d] = threeOptions(original[d], i, rotation);
  });
  return days;
}

const flaviaWeek1 = buildDays(0);
const flaviaWeek2 = buildDays(1);

const strip = (days) => Object.fromEntries(Object.entries(days).map(([d, meals]) => [d, Object.fromEntries(Object.entries(meals).map(([m, opts]) => [m, clean(opts)]))]));

await api(`/rest/v1/training_plans?id=eq.${flaviaPlan.id}`, "PATCH", { days: strip(flaviaWeek1), status: "publicado" });
console.log("Flavia · semana 28/9: 3 opciones por comida (conserva el menú original como opción A).");

const existingNext = await api(`/rest/v1/training_plans?select=id&student_id=eq.${flavia}&disciplina=eq.nutricion&week_start=eq.2026-10-05`);
const { id: _i, created_at, updated_at, ...flaviaRow } = flaviaPlan;
if (existingNext.length > 0) await api(`/rest/v1/training_plans?id=eq.${existingNext[0].id}`, "PATCH", { days: strip(flaviaWeek2), status: "publicado" });
else await api("/rest/v1/training_plans", "POST", { ...flaviaRow, week_start: "2026-10-05", days: strip(flaviaWeek2), status: "publicado" });
console.log("Flavia · semana 5/10 publicada (para probar el flujo de elegir la semana que viene).");

// Yo: mismas comidas, mayor cantidad
function myDays(flaviaDays) {
  return Object.fromEntries(Object.entries(flaviaDays).map(([d, meals]) => [d, scaledDay(meals)]));
}
const mine1 = myDays(flaviaWeek1);
const mine2 = myDays(flaviaWeek2);

const summary = (days) =>
  DIAS.filter((d) => days[d]).map((d) => {
    const meals = Object.values(days[d]);
    return `${d.padEnd(9)} ${meals.reduce((s, o) => s + o[0].kcal, 0)} kcal · ${meals.reduce((s, o) => s + o[0].protein, 0)} g prot`;
  });
console.log("Yo · semana 28/9 (opción A de cada comida):\n  " + summary(mine1).join("\n  "));

for (const [week, days] of [["2026-09-28", mine1], ["2026-10-05", mine2]]) {
  const rows = await api(`/rest/v1/training_plans?select=id&student_id=eq.${yo}&disciplina=eq.nutricion&week_start=eq.${week}`);
  if (rows.length === 0) throw new Error(`No hay plan de nutrición de ${week} en jgabrielrosa8 (hay que crear la fila primero)`);
  await api(`/rest/v1/training_plans?id=eq.${rows[0].id}`, "PATCH", { days, status: "publicado" });
  console.log(`Yo · semana ${week} actualizada.`);
}
