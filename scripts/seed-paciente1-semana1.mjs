// Semana 1 (28/9–4/10) de paciente1.demo: plan variado de la Nutricionista (2-3 opciones por
// comida, rotando la opción A por día) + dieta real con ~90% de similitud y algunos alimentos
// que no comió (alergia / no le gusta). Idempotente. Uso: node scripts/seed-paciente1-semana1.mjs
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

const opt = (nombre, kcal, protein, carbs, fat, explicacion) => ({ nombre, kcal, protein, carbs, fat, explicacion });

const POOL = {
  des: [
    opt("Yogur griego con avena y frutos rojos", 300, 28, 30, 8, "Base del día: proteína alta y fibra para llegar con saciedad al almuerzo."),
    opt("Tostadas integrales con huevo y palta", 340, 18, 30, 16, "Si entrenás temprano: más grasas buenas y energía sostenida."),
    opt("Licuado proteico de banana y avena", 320, 26, 38, 7, "Cuando hay poco tiempo: se toma rápido y no pesa."),
  ],
  alm: [
    opt("Pechuga de pollo con arroz integral y ensalada", 520, 46, 48, 12, "Plato de referencia: proteína magra y carbohidrato complejo."),
    opt("Milanesa de pollo al horno con puré de calabaza", 540, 42, 50, 16, "Alternativa más reconfortante, horneada y sin fritura."),
    opt("Bife magro con papas al horno y ensalada", 560, 44, 45, 20, "Día de entrenamiento de fuerza: suma hierro y calorías."),
    opt("Tarta de atún y vegetales", 500, 34, 42, 20, "Opción práctica para llevar; masa integral."),
  ],
  mer: [
    opt("Yogur descremado con fruta", 180, 15, 22, 3, "Merienda liviana, suma calcio."),
    opt("Tostada con queso untable y pavo", 210, 16, 22, 7, "Más saciante si la cena es tarde."),
    opt("Licuado de frutilla con leche descremada", 190, 12, 30, 2, "Dulce y fresco sin azúcar agregada."),
  ],
  cen: [
    opt("Merluza al horno con vegetales", 380, 40, 20, 12, "Cena liviana y alta en proteína."),
    opt("Omelette de claras y espinaca con ensalada", 360, 34, 14, 16, "Rápida; buena si almorzaste pesado."),
    opt("Salmón grillado con calabaza", 450, 38, 18, 24, "Omega 3: una vez por semana."),
    opt("Wok de vegetales con pollo", 400, 38, 28, 14, "Más volumen con pocas calorías."),
  ],
  col: [
    opt("Huevos duros (2)", 156, 13, 1, 11, "Colación proteica, sin carbohidrato."),
    opt("Manzana con almendras", 170, 4, 22, 8, "Fibra y grasas buenas para cortar el hambre."),
  ],
};

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const FECHAS = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
const MEALS = ["des", "alm", "mer", "cen", "col"];

// La opción A rota por día (se reordena el pool); la Nutricionista ofrece 2-3 por comida.
function planForDay(dayIndex) {
  const day = {};
  for (const meal of MEALS) {
    const pool = POOL[meal];
    const start = (dayIndex + (meal === "alm" ? 1 : 0)) % pool.length;
    const count = pool.length >= 4 ? 3 : Math.min(pool.length, 2 + (dayIndex % 2));
    day[meal] = Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]);
  }
  // Miércoles: el salmón es la opción A de la cena (para marcar la alergia más abajo).
  if (dayIndex === 2) day.cen = [POOL.cen[2], POOL.cen[1], POOL.cen[0]];
  // Jueves: desayuno con avena como opción A (no le gusta).
  if (dayIndex === 3) day.des = [POOL.des[0], POOL.des[1], POOL.des[2]];
  // Martes: merienda con yogur descremado como opción A (no le gusta).
  if (dayIndex === 1) day.mer = [POOL.mer[0], POOL.mer[1]];
  return day;
}

const planDays = Object.fromEntries(DIAS.map((d, i) => [d, planForDay(i)]));

// Dieta real: { factor general, cambios puntuales }
const REAL = [
  { factor: 0.97 },
  { factor: 1.08, omitir: { mer: "No le gusta el yogur descremado" } },
  { factor: 0.93, reemplazar: { cen: opt("Omelette de claras y espinaca con ensalada", 360, 34, 14, 16, "") }, motivo: { cen: "Alergia al pescado azul (salmón)" } },
  { factor: 1.12, reemplazar: { des: opt("Tostadas con mermelada light", 260, 8, 46, 4, "") }, motivo: { des: "No le gusta la avena" } },
  { factor: 0.93 },
  { factor: 1.0, reemplazar: { alm: opt("Asado con ensalada y una porción de pan", 780, 52, 35, 42, "") }, motivo: { alm: "Almuerzo familiar fuera de plan" } },
  { factor: 0.88, omitir: { col: "No tuvo hambre" } },
];

const itemId = (n) => `sim-${Date.now()}-${n}-${Math.random().toString(36).slice(2, 6)}`;

function similarity(planned, actual) {
  return Math.max(0, Math.round(100 - (Math.abs(actual - planned) / planned) * 100));
}

const rows = [];
const omisiones = {};
let sumPct = 0;
FECHAS.forEach((fecha, i) => {
  const plan = planDays[DIAS[i]];
  const cfg = REAL[i];
  const row = { fecha };
  let plannedKcal = 0;
  let actualKcal = 0;
  omisiones[fecha] = [];
  for (const meal of MEALS) {
    const a = plan[meal][0];
    plannedKcal += a.kcal;
    if (cfg.omitir?.[meal]) {
      omisiones[fecha].push({ comida: meal, alimento: a.nombre, motivo: /alerg/i.test(cfg.omitir[meal]) ? "alergia" : /gusta/i.test(cfg.omitir[meal]) ? "no_le_gusta" : "otro", nota: cfg.omitir[meal] });
      row[`${meal}_k`] = 0; row[`${meal}_p`] = 0; row[`${meal}_c`] = 0; row[`${meal}_g`] = 0; row[`${meal}_f`] = 0;
      row[`${meal}_items`] = [];
      continue;
    }
    const src = cfg.reemplazar?.[meal] ?? a;
    if (cfg.reemplazar?.[meal]) {
      omisiones[fecha].push({ comida: meal, alimento: a.nombre, motivo: /alerg/i.test(cfg.motivo[meal]) ? "alergia" : /gusta/i.test(cfg.motivo[meal]) ? "no_le_gusta" : "otro", nota: `${cfg.motivo[meal]} — comió: ${src.nombre}` });
    }
    const f = cfg.reemplazar?.[meal] ? 1 : cfg.factor;
    const k = Math.round(src.kcal * f);
    const p = Math.round(src.protein * f);
    const c = Math.round(src.carbs * f);
    const g = Math.round(src.fat * f);
    actualKcal += k;
    row[`${meal}_k`] = k; row[`${meal}_p`] = p; row[`${meal}_c`] = c; row[`${meal}_g`] = g; row[`${meal}_f`] = 0;
    row[`${meal}_items`] = [{ id: itemId(`${i}${meal}`), nombre: src.nombre, kcal: k, protein: p, carbs: c, fat: g }];
  }
  const pct = similarity(plannedKcal, actualKcal);
  sumPct += pct;
  console.log(fecha, DIAS[i].padEnd(9), "plan", plannedKcal, "real", actualKcal, `→ ${pct}%`);
  row.alimentos = MEALS.flatMap((m) => (row[`${m}_items`] || []).map((it) => it.nombre));
  row.pasos = [8200, 9100, 7600, 10200, 6800, 12000, 5400][i];
  row.entreno = [true, false, true, false, true, false, false][i];
  rows.push(row);
});
console.log("Adherencia promedio simulada:", Math.round(sumPct / 7) + "%");

const users = (await api("/auth/v1/admin/users?per_page=1000")).users;
const userId = users.find((u) => u.email === "paciente1.demo@morphytest.app").id;
const nutriId = users.find((u) => u.email === "nutricionista.demo@morphytest.app").id;

// Plan publicado de la semana (se reemplaza el contenido del que ya existe)
const plans = await api(`/rest/v1/training_plans?select=id&student_id=eq.${userId}&disciplina=eq.nutricion&week_start=eq.2026-09-28`);
if (plans.length === 0) throw new Error("No hay plan de nutrición para 2026-09-28 en paciente1.demo");
await api(`/rest/v1/training_plans?id=eq.${plans[0].id}`, "PATCH", { days: planDays, trainer_id: nutriId });
console.log("Plan actualizado (7 días, 2-3 opciones por comida).");

// Días reales
const full = rows.map((r) => ({ ...r, user_id: userId }));
await api("/rest/v1/days?on_conflict=user_id,fecha", "POST", full, "resolution=merge-duplicates");
console.log("Días reales cargados.");

// Omisiones (alergia / no le gusta): necesita la columna days.omisiones (migration_2026-10-05)
try {
  for (const fecha of FECHAS) {
    await api(`/rest/v1/days?user_id=eq.${userId}&fecha=eq.${fecha}`, "PATCH", { omisiones: omisiones[fecha] });
  }
  console.log("Omisiones guardadas.");
} catch (e) {
  console.warn("Omisiones NO guardadas (falta correr migration_2026-10-05_add_omisiones.sql):", String(e.message).slice(0, 120));
}
