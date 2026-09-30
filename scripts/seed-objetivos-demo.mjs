// Objetivos de ejemplo para paciente1.demo (los fija nutricionista.demo): uno que ya se cumple (para ver el logro),
// uno en progreso y uno manual (agua). Idempotente: borra los anteriores de esa pareja antes de crear.
import fs from "fs";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const api = async (p, m = "GET", b) => { const r = await fetch(U + p, { method: m, headers: H, body: b === undefined ? undefined : JSON.stringify(b) }); const t = await r.text(); if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t}`); return t ? JSON.parse(t) : null; };
const users = (await api("/auth/v1/admin/users?per_page=1000")).users;
const student = users.find((u) => u.email === "paciente1.demo@morphytest.app").id;
const trainer = users.find((u) => u.email === "nutricionista.demo@morphytest.app").id;
await api(`/rest/v1/objectives?student_id=eq.${student}&trainer_id=eq.${trainer}`, "DELETE");
const base = { student_id: student, trainer_id: trainer, disciplina: "nutricion", unidad: "", ejercicio: null, fecha_limite: null };
await api("/rest/v1/objectives", "POST", [
  { ...base, tipo: "proteina", nombre: "Llegar a 100 g de proteína por día", meta: 100, unidad: "g", direccion: "min", ventana: "dia", dias_por_semana: 2, semanas_seguidas: 1 },
  { ...base, tipo: "pasos", nombre: "Caminar 9.000 pasos por día", meta: 9000, unidad: "pasos", direccion: "min", ventana: "dia", dias_por_semana: 5, semanas_seguidas: 2 },
  { ...base, tipo: "agua", nombre: "Tomar 2 litros de agua por día", meta: 2, unidad: "litros", direccion: "min", ventana: "dia", dias_por_semana: 5, semanas_seguidas: 2 },
]);
console.log("Objetivos de ejemplo creados para paciente1.demo.");
