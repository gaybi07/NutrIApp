// Respaldo completo de los datos de UNA cuenta (lo registrado: días con comidas / entrenamientos / ejercicios, ajustes,
// rutinas, planes, objetivos, puntos) en backups/<email>-<fecha>.json + un resumen legible en .md.
// Los respaldos quedan fuera de git (datos personales). Para volver a subirlos: node scripts/restore-account.mjs <archivo>
// Uso: node scripts/backup-account.mjs jgabrielrosa8@gmail.com
import fs from "fs";

const email = process.argv[2];
if (!email) throw new Error("Falta el email de la cuenta");
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const get = async (p) => { const r = await fetch(U + p, { headers: H }); if (!r.ok) return { error: `${r.status} ${await r.text()}` }; return r.json(); };

const users = (await get("/auth/v1/admin/users?per_page=1000")).users;
const user = users.find((u) => u.email === email);
if (!user) throw new Error("No existe esa cuenta");
const id = user.id;

const tables = {
  days: `/rest/v1/days?select=*&user_id=eq.${id}&order=fecha`,
  user_settings: `/rest/v1/user_settings?select=*&user_id=eq.${id}`,
  training_plans_como_alumno: `/rest/v1/training_plans?select=*&student_id=eq.${id}&order=week_start`,
  assigned_sessions: `/rest/v1/assigned_sessions?select=*&student_id=eq.${id}`,
  trainer_links_como_alumno: `/rest/v1/trainer_links?select=*&student_id=eq.${id}`,
  trainer_comments_recibidos: `/rest/v1/trainer_comments?select=*&student_id=eq.${id}`,
  reports_recibidos: `/rest/v1/reports?select=*&student_id=eq.${id}`,
  objectives: `/rest/v1/objectives?select=*&student_id=eq.${id}`,
  objective_checks: `/rest/v1/objective_checks?select=*&student_id=eq.${id}`,
  points_ledger: `/rest/v1/points_ledger?select=*&student_id=eq.${id}`,
  plan_selections: `/rest/v1/plan_selections?select=*&student_id=eq.${id}`,
  household_week_selections: `/rest/v1/household_week_selections?select=*&user_id=eq.${id}`,
  meal_preparations: `/rest/v1/meal_preparations?select=*&user_id=eq.${id}`,
  days_history: `/rest/v1/days_history?select=*&user_id=eq.${id}`,
};
const data = { _meta: { email, user_id: id, exportado: new Date().toISOString() } };
for (const [name, path] of Object.entries(tables)) data[name] = await get(path);

fs.mkdirSync("backups", { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const base = `backups/${email.split("@")[0]}-${stamp}`;
fs.writeFileSync(`${base}.json`, JSON.stringify(data, null, 1));

// ---------- Resumen ----------
const days = Array.isArray(data.days) ? data.days : [];
const settings = Array.isArray(data.user_settings) ? data.user_settings[0] || {} : {};
const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);
const volOf = (d) => (d.ejercicios || []).reduce((s, e) => {
  const sets = e.sets?.length ? e.sets : Array.from({ length: e.series || 0 }, () => ({ repeticiones: e.repeticiones || 0, peso: e.peso || 0 }));
  return s + sets.reduce((a, x) => a + (x.repeticiones || 0) * (x.peso || 0), 0);
}, 0);
const mealK = (d) => (d.des_k || 0) + (d.alm_k || 0) + (d.mer_k || 0) + (d.cen_k || 0) + (d.col_k || 0);
const mealP = (d) => (d.des_p || 0) + (d.alm_p || 0) + (d.mer_p || 0) + (d.cen_p || 0) + (d.col_p || 0);
const withTrain = days.filter((d) => (d.ejercicios || []).length > 0 || (d.entrenamientos || []).length > 0 || d.entreno);
const withFood = days.filter((d) => mealK(d) > 0);
const prs = {};
for (const d of days) for (const e of d.ejercicios || []) {
  const best = Math.max(e.peso || 0, ...(e.sets || []).map((s) => s.peso || 0));
  if (best > 0 && (!prs[e.nombre] || best > prs[e.nombre].peso)) prs[e.nombre] = { peso: best, fecha: d.fecha };
}
const weights = Object.entries(settings.weekly_weights || {}).sort();
const lines = [];
lines.push(`# Resumen de ${email}`, `Exportado el ${data._meta.exportado.slice(0, 16).replace("T", " ")} · ${days.length} días registrados (${days[0]?.fecha ?? "-"} a ${days[days.length - 1]?.fecha ?? "-"})`, "");
lines.push("## Entrenamientos", `- Días con entrenamiento: **${withTrain.length}**`, `- Minutos entrenados: **${sum(withTrain, (d) => (d.entrenamientos || []).reduce((s, x) => s + (x.minutos || 0), 0) || d.entreno_minutos)}**`, `- Volumen total (series × reps × peso): **${Math.round(sum(days, volOf)).toLocaleString("es-AR")} kg**`, "");
for (const d of withTrain) {
  const ses = (d.entrenamientos || []).map((x) => `${x.tipo || "sesión"} ${x.minutos} min (${x.intensidad})`).join(", ") || `${d.entreno_minutos ?? "?"} min`;
  lines.push(`- **${d.fecha}**: ${ses} · ${(d.ejercicios || []).length} ejercicios · volumen ${Math.round(volOf(d)).toLocaleString("es-AR")} kg${d.entrenamiento_reporte ? ` · reporte en vivo ${d.entrenamiento_reporte.minutos} min` : ""}`);
}
lines.push("", "### Mejores pesos por ejercicio");
for (const [n, v] of Object.entries(prs).sort((a, b) => b[1].peso - a[1].peso)) lines.push(`- ${n}: **${v.peso} kg** (${v.fecha})`);
lines.push("", "## Comidas", `- Días con comidas cargadas: **${withFood.length}**`, `- Promedio: **${withFood.length ? Math.round(sum(withFood, mealK) / withFood.length) : 0} kcal** y **${withFood.length ? Math.round(sum(withFood, mealP) / withFood.length) : 0} g de proteína** por día`);
for (const d of withFood) lines.push(`- ${d.fecha}: ${mealK(d)} kcal · ${mealP(d)} g prot · pasos ${d.pasos || "-"}`);
lines.push("", "## Peso semanal", ...(weights.length ? weights.map(([f, p]) => `- ${f}: ${p} kg`) : ["- (sin pesos cargados)"]));
lines.push("", "## Rutinas y plan", `- Rutinas: ${(settings.routines || []).map((r) => `${r.nombre} (${(r.ejercicios || []).length} ej.)`).join(", ") || "ninguna"}`, `- Objetivo: ${settings.goal ?? "-"} kcal · perfil ${settings.calculator_profile ? `${settings.calculator_profile.modo} ${settings.calculator_profile.actual} → ${settings.calculator_profile.meta} kg` : "-"}`);
const plans = Array.isArray(data.training_plans_como_alumno) ? data.training_plans_como_alumno : [];
lines.push(`- Planes de profesionales: ${plans.map((p) => `${p.disciplina} ${p.week_start}`).join(", ") || "ninguno"}`);
lines.push("", "## Puntos y objetivos", `- Puntos: **${Array.isArray(data.points_ledger) ? sum(data.points_ledger, (x) => x.puntos) : 0}** · objetivos: ${Array.isArray(data.objectives) ? data.objectives.length : 0}`);
fs.writeFileSync(`${base}-resumen.md`, lines.join("\n"));
console.log(`Respaldo: ${base}.json\nResumen:  ${base}-resumen.md\n`);
console.log(lines.join("\n"));
