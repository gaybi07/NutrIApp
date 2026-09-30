// Semana 1 (28/9–4/10) de paciente1.demo: plan de la Nutricionista con 3 opciones por comida (cada una con su
// nivel: perfecta = violeta, buena = verde, ocasional = amarillo, con cantidades) + dieta real cargada hasta el
// viernes a mediodía, con alimentos que no comió (alergia / no le gusta).
// Idempotente. Uso: node scripts/seed-paciente1-semana1.mjs
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
async function api(path, method = "GET", body, prefer) {
  const res = await fetch(U + path, { method, headers: prefer ? { ...H, Prefer: prefer } : H, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${t}`);
  return t ? JSON.parse(t) : null;
}

// nombre, kcal, proteína, carbos, grasas, nivel, explicación, [ingredientes: nombre, cantidad, unidad]
const o = (nombre, kcal, protein, carbs, fat, nivel, explicacion, ings) => ({
  nombre, kcal, protein, carbs, fat, nivel, explicacion,
  ingredientes: ings.map(([name, quantity, unit]) => ({ name, quantity, unit })),
});

const SETS = {
  des: [
    [
      o("Yogur griego con avena y frutos rojos", 300, 28, 30, 8, "optima", "La mejor para arrancar: proteína alta y fibra.", [["Yogur griego descremado", 200, "g"], ["Avena", 30, "g"], ["Frutos rojos", 100, "g"], ["Nueces", 10, "g"]]),
      o("Tostadas integrales con huevo y palta", 340, 18, 30, 16, "buena", "Buena opción si entrenás temprano.", [["Pan integral (2 tostadas)", 50, "g"], ["Huevo", 1, "u."], ["Claras", 2, "u."], ["Palta", 40, "g"]]),
      o("Medialunas (2) con café con leche", 420, 11, 52, 18, "ocasional", "De vez en cuando: más grasa y menos proteína.", [["Medialunas", 2, "u."], ["Café con leche descremada", 200, "ml"]]),
    ],
    [
      o("Licuado proteico de banana y avena", 320, 26, 38, 7, "optima", "Rápido y completo, no pesa.", [["Leche descremada", 250, "ml"], ["Banana", 1, "u."], ["Avena", 30, "g"], ["Proteína en polvo", 25, "g"]]),
      o("Tostadas con queso untable y fruta", 300, 14, 38, 9, "buena", "Liviano y simple.", [["Pan integral (2 tostadas)", 50, "g"], ["Queso untable descremado", 30, "g"], ["Fruta", 1, "u."]]),
      o("Budín de banana con café con leche", 400, 8, 54, 16, "ocasional", "Ocasional: más azúcar y grasa por porción.", [["Budín de banana", 100, "g"], ["Café con leche descremada", 200, "ml"]]),
    ],
  ],
  alm: [
    [
      o("Pechuga de pollo con arroz integral y ensalada", 520, 46, 48, 12, "optima", "Plato de referencia: proteína magra y carbohidrato complejo.", [["Pechuga de pollo", 130, "g"], ["Arroz integral cocido", 120, "g"], ["Ensalada de tomate y lechuga", 150, "g"], ["Aceite de oliva", 5, "ml"]]),
      o("Tarta de atún y vegetales", 500, 34, 42, 20, "buena", "Práctica para llevar; masa integral.", [["Atún al natural", 120, "g"], ["Masa integral", 60, "g"], ["Zapallitos y cebolla", 150, "g"], ["Huevo", 1, "u."]]),
      o("Milanesa napolitana con papas fritas", 780, 42, 62, 38, "ocasional", "Ocasional: frita y muy densa en calorías.", [["Milanesa napolitana", 200, "g"], ["Papas fritas", 150, "g"]]),
    ],
    [
      o("Pollo al horno con batata y ensalada", 540, 46, 50, 14, "optima", "Proteína magra con carbohidrato de absorción lenta.", [["Pollo al horno", 150, "g"], ["Batata", 180, "g"], ["Ensalada de tomate, lechuga y zanahoria", 150, "g"], ["Aceite de oliva", 5, "ml"]]),
      o("Milanesa de pollo al horno con puré de calabaza", 540, 42, 50, 16, "buena", "Reconfortante, horneada y sin fritura.", [["Milanesa de pollo al horno", 150, "g"], ["Puré de calabaza", 200, "g"], ["Ensalada de lechuga y tomate", 150, "g"]]),
      o("Hamburguesa con papas fritas", 760, 34, 66, 38, "ocasional", "Ocasional: más grasa y menos proteína por kcal.", [["Hamburguesa con pan", 180, "g"], ["Papas fritas", 150, "g"]]),
    ],
  ],
  mer: [
    [
      o("Yogur descremado con fruta", 180, 15, 22, 3, "optima", "Liviana, suma calcio y proteína.", [["Yogur descremado", 170, "g"], ["Fruta pequeña", 1, "u."]]),
      o("Tostada con queso untable y pavo", 210, 16, 22, 7, "buena", "Más saciante si la cena es tarde.", [["Pan integral (2 tostadas)", 40, "g"], ["Queso untable descremado", 20, "g"], ["Pechuga de pavo", 30, "g"]]),
      o("Facturas (2) con mate cocido", 340, 6, 48, 14, "ocasional", "Ocasional: poca proteína y mucha grasa.", [["Facturas", 2, "u."], ["Mate cocido", 200, "ml"]]),
    ],
    [
      o("Licuado de frutilla con leche descremada", 190, 12, 30, 2, "optima", "Dulce y fresco sin azúcar agregada.", [["Leche descremada", 200, "ml"], ["Frutillas", 100, "g"]]),
      o("Yogur griego con granola", 240, 16, 28, 8, "buena", "Buena, cuidá la porción de granola.", [["Yogur griego", 150, "g"], ["Granola", 25, "g"]]),
      o("Alfajor con café con leche", 320, 5, 46, 13, "ocasional", "Ocasional: azúcar y grasa, poca proteína.", [["Alfajor", 1, "u."], ["Café con leche descremada", 200, "ml"]]),
    ],
  ],
  cen: [
    [
      o("Merluza al horno con vegetales", 380, 40, 20, 12, "optima", "Cena liviana y alta en proteína.", [["Merluza", 160, "g"], ["Vegetales al horno", 200, "g"], ["Aceite de oliva", 5, "ml"]]),
      o("Omelette de claras y espinaca con ensalada", 360, 34, 14, 16, "buena", "Rápida; buena si almorzaste pesado.", [["Huevo", 1, "u."], ["Claras", 3, "u."], ["Espinaca", 60, "g"], ["Ensalada fresca", 150, "g"]]),
      o("Pizza (2 porciones)", 560, 22, 62, 24, "ocasional", "Ocasional: más calorías por porción y menos proteína.", [["Pizza de muzzarella", 2, "u."]]),
    ],
    [
      o("Wok de vegetales con pollo", 400, 38, 28, 14, "optima", "Mucho volumen con pocas calorías.", [["Pollo", 120, "g"], ["Vegetales salteados", 250, "g"], ["Salsa de soja", 15, "ml"]]),
      o("Hamburguesa casera con ensalada", 480, 34, 26, 26, "buena", "Casera y magra, sin pan refinado.", [["Carne magra picada", 140, "g"], ["Ensalada abundante", 200, "g"], ["Papa al horno", 150, "g"]]),
      o("Empanadas (3)", 690, 24, 66, 36, "ocasional", "Ocasional: masa y fritura suman mucha grasa.", [["Empanadas", 3, "u."]]),
    ],
  ],
  col: [
    [
      o("Huevos duros (2)", 156, 13, 1, 11, "optima", "Colación proteica, sin carbohidrato.", [["Huevo duro", 2, "u."]]),
      o("Manzana con almendras", 170, 4, 22, 8, "buena", "Fibra y grasas buenas para cortar el hambre.", [["Manzana", 1, "u."], ["Almendras", 15, "g"]]),
      o("Barra de cereal con chocolate", 190, 3, 30, 7, "ocasional", "Ocasional: azúcar y poca proteína.", [["Barra de cereal", 1, "u."]]),
    ],
    [
      o("Yogur proteico", 120, 18, 6, 2, "optima", "Mucha proteína por kcal.", [["Yogur proteico", 170, "g"]]),
      o("Puñado de frutos secos", 180, 5, 6, 16, "buena", "Grasas buenas; medir la porción.", [["Frutos secos", 30, "g"]]),
      o("Chocolate (3 cuadraditos)", 160, 2, 14, 11, "ocasional", "Ocasional: grasa y azúcar.", [["Chocolate", 25, "g"]]),
    ],
  ],
};

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const FECHAS = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
const MEALS = ["des", "alm", "mer", "cen", "col"];

// Plan: cada día usa un set distinto por paridad (hay variedad), 3 opciones por comida, A = la perfecta.
const SALMON = o("Salmón grillado con calabaza", 450, 38, 18, 24, "optima", "Omega 3: una vez por semana.", [["Salmón", 130, "g"], ["Calabaza asada", 200, "g"]]);
function planForDay(i) {
  const day = {};
  for (const meal of MEALS) day[meal] = SETS[meal][i % 2];
  if (i === 2) day.cen = [SALMON, SETS.cen[0][1], SETS.cen[0][2]]; // miércoles: salmón como opción perfecta
  return day;
}
const planDays = Object.fromEntries(DIAS.map((d, i) => [d, planForDay(i)]));

// Dieta real. Elección: 0 perfecta, 1 buena, 2 ocasional · "skip" no la comió · { off } comió otra cosa
const OFF_TOSTADAS = o("Tostadas con mermelada light", 260, 8, 46, 4, "buena", "", []);
const REAL = [
  { factor: 0.98, des: 0, alm: 0, mer: 1, cen: 0, col: 0 },
  { factor: 1.06, des: 1, alm: 1, mer: "skip", cen: 1, col: 1, notas: { mer: ["otro", "No tuvo hambre a la tarde"] } },
  { factor: 0.95, des: 0, alm: 1, mer: 2, cen: 1, col: 0, notas: { cen: ["alergia", "Alergia al pescado azul: en vez del salmón comió la omelette"] } },
  { factor: 1.05, des: { off: OFF_TOSTADAS }, alm: 1, mer: 2, cen: 0, col: 1, notas: { des: ["no_le_gusta", "No le gusta la avena: comió tostadas con mermelada"] } },
  { factor: 1.0, des: 2, alm: 1 }, // viernes a mediodía: solo desayuno y almuerzo
];

const itemId = (n) => `sim-${Date.now()}-${n}-${Math.random().toString(36).slice(2, 6)}`;
const rows = [];
const omisiones = {};
let sumPct = 0;
REAL.forEach((cfg, i) => {
  const fecha = FECHAS[i];
  const plan = planDays[DIAS[i]];
  const row = { fecha };
  let plannedKcal = 0;
  let actualKcal = 0;
  omisiones[fecha] = [];
  for (const meal of MEALS) {
    const options = plan[meal];
    const choice = cfg[meal];
    const empty = () => { for (const k of ["k", "p", "c", "g", "f"]) row[`${meal}_${k}`] = 0; row[`${meal}_items`] = []; };
    if (choice === undefined) { empty(); continue; } // todavía no llegó esa comida
    plannedKcal += options[0].kcal;
    if (choice === "skip") {
      empty();
      const [motivo, nota] = cfg.notas[meal];
      omisiones[fecha].push({ comida: meal, alimento: options[0].nombre, motivo, nota });
      continue;
    }
    const src = typeof choice === "object" ? choice.off : options[choice];
    if (cfg.notas?.[meal]) {
      const [motivo, nota] = cfg.notas[meal];
      omisiones[fecha].push({ comida: meal, alimento: options[0].nombre, motivo, nota });
    }
    const f = typeof choice === "object" ? 1 : cfg.factor;
    const k = Math.round(src.kcal * f), p = Math.round(src.protein * f), c = Math.round(src.carbs * f), g = Math.round(src.fat * f);
    actualKcal += k;
    row[`${meal}_k`] = k; row[`${meal}_p`] = p; row[`${meal}_c`] = c; row[`${meal}_g`] = g; row[`${meal}_f`] = 0;
    row[`${meal}_items`] = [{ id: itemId(`${i}${meal}`), nombre: src.nombre, kcal: k, protein: p, carbs: c, fat: g }];
  }
  const pct = plannedKcal > 0 ? Math.max(0, Math.round(100 - (Math.abs(actualKcal - plannedKcal) / plannedKcal) * 100)) : 0;
  sumPct += pct;
  console.log(fecha, DIAS[i].padEnd(9), "plan(A)", plannedKcal, "real", actualKcal, `→ ${pct}%`);
  row.alimentos = MEALS.flatMap((m) => (row[`${m}_items`] || []).map((it) => it.nombre));
  row.pasos = [8200, 9100, 7600, 10200, 6800][i];
  row.entreno = [true, false, true, false, true][i];
  rows.push(row);
});
console.log("Similitud de kcal vs. opción A (lun-vie, viernes parcial):", Math.round(sumPct / REAL.length) + "%");

const users = (await api("/auth/v1/admin/users?per_page=1000")).users;
const userId = users.find((u) => u.email === "paciente1.demo@morphytest.app").id;
const nutriId = users.find((u) => u.email === "nutricionista.demo@morphytest.app").id;

const plans = await api(`/rest/v1/training_plans?select=id&student_id=eq.${userId}&disciplina=eq.nutricion&week_start=eq.2026-09-28`);
if (plans.length === 0) throw new Error("No hay plan de nutrición para 2026-09-28 en paciente1.demo");
await api(`/rest/v1/training_plans?id=eq.${plans[0].id}`, "PATCH", { days: planDays, trainer_id: nutriId });
console.log("Plan actualizado: 3 opciones por comida (perfecta / buena / ocasional), con cantidades.");

await api("/rest/v1/days?on_conflict=user_id,fecha", "POST", rows.map((r) => ({ ...r, user_id: userId })), "resolution=merge-duplicates");
console.log("Días reales cargados (hasta el viernes a mediodía).");

for (const fecha of FECHAS.slice(REAL.length)) await api(`/rest/v1/days?user_id=eq.${userId}&fecha=eq.${fecha}`, "DELETE");

try {
  for (const fecha of FECHAS.slice(0, REAL.length)) {
    await api(`/rest/v1/days?user_id=eq.${userId}&fecha=eq.${fecha}`, "PATCH", { omisiones: omisiones[fecha] });
  }
  console.log("Omisiones guardadas.");
} catch (e) {
  console.warn("Omisiones NO guardadas (falta correr migration_2026-10-05_add_omisiones.sql):", String(e.message).slice(0, 120));
}
