// Carga (o actualiza) una medición corporal de una cuenta en una fecha, desde un JSON.
// Uso: node scripts/cargar-medicion.mjs email@cuenta.com 2026-08-30 '{"cintura":110.5,"peso":116}' [--simular]
// Solo toca la fila (cuenta, fecha) de body_measurements; no pisa los campos que no vengan en el JSON.
import fs from "fs";

const [email, fecha, json] = process.argv.slice(2);
const simular = process.argv.includes("--simular");
if (!email || !fecha || !json) {
  console.error("Uso: node scripts/cargar-medicion.mjs email fecha(YYYY-MM-DD) '{...}' [--simular]");
  process.exit(1);
}
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const api = async (p, m = "GET", b, extra = {}) => {
  const r = await fetch(U + p, { method: m, headers: { ...H, ...extra }, body: b === undefined ? undefined : JSON.stringify(b) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
};

const id = (await api("/auth/v1/admin/users?per_page=1000")).users.find((u) => u.email === email)?.id;
if (!id) throw new Error("No existe la cuenta " + email);
const values = JSON.parse(json);
const previas = await api(`/rest/v1/body_measurements?select=*&user_id=eq.${id}&fecha=eq.${fecha}`);
console.log(previas.length ? "Ya había una medición ese día; se completan solo los campos enviados." : "No había medición ese día.");
const row = { ...(previas[0] || {}), ...values, user_id: id, fecha };
console.log(simular ? "[SIMULACIÓN]" : "Guardando:", row);
if (!simular) await api("/rest/v1/body_measurements?on_conflict=user_id,fecha", "POST", row, { Prefer: "resolution=merge-duplicates,return=minimal" });
const todas = await api(`/rest/v1/body_measurements?select=fecha&user_id=eq.${id}&order=fecha`);
console.log("Mediciones de la cuenta:", todas.map((x) => x.fecha).join(", "));
