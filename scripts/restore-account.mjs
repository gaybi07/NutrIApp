// Vuelve a subir (restaura) a la base los datos de un respaldo hecho con backup-account.mjs.
// Por defecto restaura SOLO los días (comidas, entrenamientos, ejercicios, reportes) y los ajustes (rutinas, agenda,
// pesos), y por cada día pisa la versión actual SOLO si el respaldo tiene más datos de entrenamiento que la base (así nunca
// reemplaza algo nuevo por algo viejo). Con --forzar pisa siempre. Hace una prueba sin escribir si se pasa --simular.
// Uso: node scripts/restore-account.mjs backups/jgabrielrosa8-2026-10-01.json [--simular] [--forzar]
import fs from "fs";

const file = process.argv[2];
const simular = process.argv.includes("--simular");
const forzar = process.argv.includes("--forzar");
if (!file) throw new Error("Falta el archivo de respaldo");
const backup = JSON.parse(fs.readFileSync(file, "utf8"));
const id = backup._meta.user_id;
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const api = async (p, m = "GET", b, prefer) => {
  const r = await fetch(U + p, { method: m, headers: prefer ? { ...H, Prefer: prefer } : H, body: b === undefined ? undefined : JSON.stringify(b) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
};

const score = (d) => (d.ejercicios || []).length * 100 + (d.entrenamientos || []).length * 10 + (d.entrenamiento_reporte ? 5 : 0);
const current = Object.fromEntries((await api(`/rest/v1/days?select=*&user_id=eq.${id}`)).map((d) => [d.fecha, d]));
let restored = 0, skipped = 0, created = 0;
for (const day of backup.days || []) {
  const now = current[day.fecha];
  if (!now) {
    if (!simular) await api("/rest/v1/days?on_conflict=user_id,fecha", "POST", [day], "resolution=merge-duplicates");
    created++;
    continue;
  }
  if (forzar || score(day) > score(now)) {
    if (!simular) await api(`/rest/v1/days?user_id=eq.${id}&fecha=eq.${day.fecha}`, "PATCH", (({ user_id, fecha, ...rest }) => rest)(day));
    restored++;
  } else skipped++;
}
console.log(`${simular ? "[SIMULACIÓN] " : ""}Días: ${created} creados, ${restored} restaurados, ${skipped} ya estaban igual o con más datos en la base.`);

// ajustes: solo rutinas, agenda y pesos semanales si en la base están vacíos (no pisa lo más nuevo)
const s = backup.user_settings?.[0];
if (s) {
  const [cur] = await api(`/rest/v1/user_settings?select=routines,training_schedule,weekly_weights&user_id=eq.${id}`);
  const patch = {};
  if (forzar || !(cur?.routines || []).length) patch.routines = s.routines;
  if (forzar || !Object.keys(cur?.training_schedule || {}).length) patch.training_schedule = s.training_schedule;
  if (forzar || !Object.keys(cur?.weekly_weights || {}).length) patch.weekly_weights = s.weekly_weights;
  if (Object.keys(patch).length && !simular) await api(`/rest/v1/user_settings?user_id=eq.${id}`, "PATCH", patch);
  console.log(`${simular ? "[SIMULACIÓN] " : ""}Ajustes restaurados: ${Object.keys(patch).join(", ") || "ninguno (ya estaban en la base)"}`);
}
