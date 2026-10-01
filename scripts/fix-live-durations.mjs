// Corrige la duración de sesiones de fuerza que quedaron pisadas por el formulario "+ Entrenamiento": si un día tiene
// reporte del entrenamiento en vivo (con su duración real) y ninguna sesión de fuerza coincide con esa duración, la sesión
// de fuerza se reemplaza por la del reporte. Conserva las demás sesiones (ej. aeróbicas). Hacer un respaldo antes.
// Solo toca sesiones genéricas (60 min sin tipo) o con diferencia de hasta 5 min; el resto lo deja para revisar a mano.
// Uso: node scripts/fix-live-durations.mjs jgabrielrosa8@gmail.com [--simular]
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
const id = (await api("/auth/v1/admin/users?per_page=1000")).users.find((u) => u.email === email).id;
const days = await api(`/rest/v1/days?select=fecha,entrenamientos,entrenamiento_reporte,ejercicios,entreno_minutos&user_id=eq.${id}&order=fecha`);

for (const d of days) {
  const rep = d.entrenamiento_reporte;
  if (!rep?.minutos || !(d.ejercicios || []).length) continue;
  const ses = d.entrenamientos || [];
  if (ses.some((s) => s.tipo === "fuerza" && s.minutos === rep.minutos)) continue; // ya coincide
  const fuerzaIdx = ses.findIndex((s) => s.tipo !== "aerobico");
  if (fuerzaIdx < 0 && ses.length > 0) continue;
  const old = ses[fuerzaIdx];
  const generica = old && !old.tipo && old.minutos === 60;
  const cercana = old && Math.abs(old.minutos - rep.minutos) <= 5;
  if (old && !generica && !cercana) {
    console.log(`${d.fecha}: se deja como está (sesión ${old.minutos} min vs reporte ${rep.minutos}; revisar a mano)`);
    continue;
  }
  const next = ses.filter((_, i) => i !== fuerzaIdx);
  next.unshift({ tipo: "fuerza", minutos: rep.minutos, intensidad: rep.overallIntensidad || "fallo" });
  console.log(`${d.fecha}: ${old ? `${old.minutos} min` : "sin sesión"} → ${rep.minutos} min (reporte en vivo)`);
  if (!simular) {
    await api(`/rest/v1/days?user_id=eq.${id}&fecha=eq.${d.fecha}`, "PATCH", {
      entrenamientos: next,
      entreno: true,
      entreno_minutos: next[0].minutos,
      entreno_intensidad: next[0].intensidad,
    });
  }
}
console.log(simular ? "(simulación: no se escribió nada)" : "Listo.");
