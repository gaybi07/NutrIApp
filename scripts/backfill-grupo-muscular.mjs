// Completa `grupoMuscular` en los ejercicios ya registrados (días) y en las rutinas de una cuenta, deduciéndolo por el nombre
// (mismas reglas que inferMuscleGroupFromName en lib/exerciseLibrary.ts). Solo agrega donde falta: no pisa un grupo ya
// cargado. Con el historial de días activo, cada cambio deja guardada la versión anterior.
// Uso: node scripts/backfill-grupo-muscular.mjs jgabrielrosa8@gmail.com [--simular]
import fs from "fs";

const email = process.argv[2];
const simular = process.argv.includes("--simular");
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const api = async (p, m = "GET", b) => {
  const r = await fetch(U + p, { method: m, headers: H, body: b === undefined ? undefined : JSON.stringify(b) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
};

const RULES = [
  [/abdominal|crunch|plancha|giro con|elevacion de piernas|rueda|russian|oblicu|core/, "core"],
  [/flexion/, "pecho"],
  [/bicep|tricep|antebrazo|curl|martillo|frances|soga|biceps|triceps/, "brazos"],
  [/lateral|militar|hombro|arnold|frontal/, "hombros"],
  [/press banca|press inclinado|apertura|pecho|fondos|cruces|pec deck|press plano|press declinado/, "pecho"],
  [/remo|dorsal|jalon|dominada|trapecio|pullover|lumbar|hiperextension|espalda|tiron/, "espalda"],
  [/sentadilla|cuadricep|gemelo|hip |hip$|hip t|glute|gluteo|puente|elevacion de cadera|prensa|zancada|desplante|femoral|abductor|aductor|peso muerto|posteriores|caminata|levantarse|step|pierna/, "piernas"],
];
const infer = (name) => {
  const n = (name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/hombro/.test(n) && /posterior/.test(n)) return "hombros";
  return RULES.find(([re]) => re.test(n))?.[1];
};
const fill = (list) => {
  let changed = 0;
  const next = (list || []).map((e) => {
    if (e.grupoMuscular) return e;
    const g = infer(e.nombre);
    if (!g) return e;
    changed++;
    return { ...e, grupoMuscular: g };
  });
  return { next, changed };
};

const id = (await api("/auth/v1/admin/users?per_page=1000")).users.find((u) => u.email === email).id;
const days = await api(`/rest/v1/days?select=fecha,ejercicios&user_id=eq.${id}&order=fecha`);
let ejercicios = 0, diasTocados = 0;
for (const d of days) {
  if (!(d.ejercicios || []).length) continue;
  const { next, changed } = fill(d.ejercicios);
  if (!changed) continue;
  ejercicios += changed;
  diasTocados++;
  if (!simular) await api(`/rest/v1/days?user_id=eq.${id}&fecha=eq.${d.fecha}`, "PATCH", { ejercicios: next });
}
console.log(`${simular ? "[SIMULACIÓN] " : ""}Días: ${ejercicios} ejercicios con grupo agregado en ${diasTocados} días.`);

const [settings] = await api(`/rest/v1/user_settings?select=routines&user_id=eq.${id}`);
let enRutinas = 0;
const routines = (settings?.routines || []).map((r) => {
  const { next, changed } = fill(r.ejercicios);
  enRutinas += changed;
  return { ...r, ejercicios: next };
});
console.log(`${simular ? "[SIMULACIÓN] " : ""}Rutinas: ${enRutinas} ejercicios con grupo agregado.`);
if (enRutinas > 0 && !simular) await api(`/rest/v1/user_settings?user_id=eq.${id}`, "PATCH", { routines });
