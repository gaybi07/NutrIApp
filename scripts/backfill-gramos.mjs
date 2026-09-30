// Completa `gramos` en las comidas ya cargadas de la semana cuando el nombre coincide con una opción del plan
// nutricional (con ingredientes y cantidades), para poder calcular la densidad (proteína cada 100 g, kcal/g).
// Idempotente: no toca items que ya tienen gramos. Uso: node scripts/backfill-gramos.mjs
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

const UNIT_GRAMS = [
  [/clara/i, 33], [/huevo/i, 50], [/banana/i, 100], [/manzana/i, 150], [/mandarina/i, 80], [/naranja/i, 130], [/kiwi/i, 75],
  [/durazno/i, 130], [/fruta/i, 120], [/galletas? de arroz/i, 10], [/galletitas/i, 15], [/medialuna/i, 60], [/factura/i, 50],
  [/alfajor/i, 45], [/empanada/i, 90], [/pizza/i, 120], [/barra de cereal/i, 25], [/hamburguesa con pan/i, 200], [/tarta/i, 180],
];
const ingGrams = (i) => (i.unit === "g" || i.unit === "ml" ? i.quantity : i.quantity * (UNIT_GRAMS.find(([re]) => re.test(i.name))?.[1] ?? 60));
const optGrams = (o) => (o.ingredientes?.length ? Math.round(o.ingredientes.reduce((s, i) => s + ingGrams(i), 0)) : null);

const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const users = (await api("/auth/v1/admin/users?per_page=1000")).users;

for (const email of ["paciente1.demo@morphytest.app", "jgabrielrosa8@gmail.com"]) {
  const userId = users.find((u) => u.email === email).id;
  const [plan] = await api(`/rest/v1/training_plans?select=days&student_id=eq.${userId}&disciplina=eq.nutricion&week_start=eq.2026-09-28`);
  if (!plan) { console.log(email, "sin plan"); continue; }
  const rows = await api(`/rest/v1/days?select=*&user_id=eq.${userId}&fecha=gte.2026-09-28&fecha=lte.2026-10-04`);
  let patched = 0;
  for (const row of rows) {
    const weekday = DIAS[new Date(`${row.fecha}T00:00:00`).getDay()];
    const patch = {};
    for (const meal of ["des", "alm", "mer", "cen", "col"]) {
      const items = row[`${meal}_items`] || [];
      if (!items.length) continue;
      const options = plan.days?.[weekday]?.[meal] || [];
      let changed = false;
      const next = items.map((item) => {
        if (item.gramos) return item;
        const opt = options.find((o) => o.nombre === item.nombre);
        const g = opt ? optGrams(opt) : null;
        if (!g) return item;
        changed = true;
        return { ...item, gramos: g };
      });
      if (changed) { patch[`${meal}_items`] = next; patched++; }
    }
    if (Object.keys(patch).length) await api(`/rest/v1/days?user_id=eq.${userId}&fecha=eq.${row.fecha}`, "PATCH", patch);
  }
  console.log(email, "→ comidas con gramos completados:", patched);
}
