// Rearma el plan de nutrición de una semana SIN colación: desayuno, almuerzo, merienda y cena, ajustados a un objetivo
// diario de kcal y proteína. Parte del plan que la cuenta ya tiene esa semana (sus 3 opciones por comida), quita la
// colación y reescala cantidades; si la proteína no llega, pone primero la opción con más proteína de las comidas donde
// más suma. Guarda una copia del plan anterior en backups/ antes de pisarlo.
// Uso: node scripts/plan-sin-colacion.mjs email 2026-10-05 [kcal=2100] [proteina=140] [--simular]
import fs from "fs";

const [email, weekStart, kcalArg, protArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const simular = process.argv.includes("--simular");
const KCAL = Number(kcalArg || 2100);
const PROT = Number(protArg || 140);
if (!email || !weekStart) {
  console.error("Uso: node scripts/plan-sin-colacion.mjs email YYYY-MM-DD [kcal] [proteina] [--simular]");
  process.exit(1);
}
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const api = async (p, m = "GET", b) => {
  const r = await fetch(U + p, { method: m, headers: H, body: b === undefined ? undefined : JSON.stringify(b) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
};

const MEALS = ["des", "alm", "mer", "cen"];
const roundQty = (q, unit) => (unit === "u." ? Math.round(q * 2) / 2 : Math.max(5, Math.round(q / 5) * 5));
const scaleOption = (o, f) => ({
  ...o,
  kcal: Math.round(o.kcal * f),
  protein: Math.round(o.protein * f),
  carbs: Math.round(o.carbs * f),
  fat: Math.round(o.fat * f),
  ingredientes: (o.ingredientes || []).map((i) => ({ ...i, quantity: roundQty(i.quantity * f, i.unit) })),
});

const id = (await api("/auth/v1/admin/users?per_page=1000")).users.find((u) => u.email === email)?.id;
if (!id) throw new Error("No existe la cuenta " + email);
const [plan] = await api(`/rest/v1/training_plans?select=*&student_id=eq.${id}&disciplina=eq.nutricion&week_start=eq.${weekStart}`);
if (!plan) throw new Error(`La cuenta no tiene plan de nutrición para ${weekStart}`);

const nuevo = {};
for (const [dia, meals] of Object.entries(plan.days)) {
  const base = Object.fromEntries(MEALS.filter((m) => meals[m]?.length).map((m) => [m, [...meals[m]]]));
  const kcalA = () => Object.values(base).reduce((s, o) => s + o[0].kcal, 0);
  const protA = () => Object.values(base).reduce((s, o) => s + o[0].protein, 0);
  // Si con el factor de kcal la proteína no llega, la opción de más proteína pasa a ser la primera en las comidas donde más suma.
  const gains = Object.keys(base)
    .map((m) => ({ m, gain: Math.max(...base[m].map((o) => o.protein / o.kcal)) - base[m][0].protein / base[m][0].kcal }))
    .sort((a, b) => b.gain - a.gain);
  for (const { m, gain } of gains) {
    if ((protA() * KCAL) / kcalA() >= PROT) break;
    if (gain <= 0) continue;
    const bestIdx = base[m].reduce((bi, o, i, arr) => (o.protein / o.kcal > arr[bi].protein / arr[bi].kcal ? i : bi), 0);
    const [best] = base[m].splice(bestIdx, 1);
    base[m].unshift(best);
  }
  const f = KCAL / kcalA();
  nuevo[dia] = Object.fromEntries(Object.entries(base).map(([m, opts]) => [m, opts.map((o) => scaleOption(o, f))]));
}

for (const [dia, meals] of Object.entries(nuevo)) {
  const a = Object.values(meals).map((o) => o[0]);
  console.log(`${dia.padEnd(10)} ${a.reduce((s, x) => s + x.kcal, 0)} kcal · ${a.reduce((s, x) => s + x.protein, 0)} g prot · comidas: ${Object.keys(meals).join(",")}`);
}
if (simular) {
  console.log("[SIMULACIÓN] no se guardó nada.");
} else {
  fs.mkdirSync("backups", { recursive: true });
  const file = `backups/plan-${email.split("@")[0]}-${weekStart}-antes.json`;
  fs.writeFileSync(file, JSON.stringify(plan, null, 2));
  await api(`/rest/v1/training_plans?id=eq.${plan.id}`, "PATCH", { days: nuevo, status: "publicado" });
  console.log(`Plan guardado (copia del anterior en ${file}).`);
}
