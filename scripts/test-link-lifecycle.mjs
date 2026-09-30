// Test automático del ciclo de vida del vínculo: primer vínculo (sin bloqueo) -> desvincularse -> vincularse a otro
// del mismo tipo (bloqueo de 14 días) -> intentar desvincularse (debe fallar) -> calificaciones.
// Usa cuentas de prueba nuevas (@morphytest.app) y las deja limpias. Uso: node scripts/test-link-lifecycle.mjs
import fs from "fs";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const U = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, PW = "Demo1234!";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
async function raw(path, method = "GET", headers = admin, body) {
  const res = await fetch(U + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await res.text(); let j; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  return { ok: res.ok, status: res.status, json: j };
}
const asUser = async (email) => {
  const r = await raw("/auth/v1/token?grant_type=password", "POST", { apikey: ANON, "Content-Type": "application/json" }, { email, password: PW });
  if (!r.ok) throw new Error("login " + email + " " + JSON.stringify(r.json));
  const h = { apikey: ANON, Authorization: `Bearer ${r.json.access_token}`, "Content-Type": "application/json" };
  return { rpc: (fn, args) => raw(`/rest/v1/rpc/${fn}`, "POST", h, args ?? {}), get: (p) => raw("/rest/v1" + p, "GET", h), post: (p, b) => raw("/rest/v1" + p, "POST", h, b), del: (p) => raw("/rest/v1" + p, "DELETE", h) };
};
let fails = 0;
const check = (name, cond, extra = "") => { console.log((cond ? "OK   " : "FALLA") + " " + name + (extra ? " — " + String(extra).slice(0, 140) : "")); if (!cond) fails++; };

const users = (await raw("/auth/v1/admin/users?per_page=1000")).json.users;
const ensure = async (email) => {
  let u = users.find((x) => x.email === email);
  if (u) await raw(`/auth/v1/admin/users/${u.id}`, "PUT", admin, { password: PW, email_confirm: true });
  else u = (await raw("/auth/v1/admin/users", "POST", admin, { email, password: PW, email_confirm: true })).json;
  return u.id;
};
const studentEmail = "cambio.demo@morphytest.app";
const sid = await ensure(studentEmail);
await raw("/rest/v1/user_settings?on_conflict=user_id", "POST", { ...admin, Prefer: "resolution=merge-duplicates" }, { user_id: sid, plan: "premium" });
// limpiar rastros de corridas anteriores
for (const t of ["trainer_links", "trainer_link_requests", "trainer_link_history", "student_link_locks", "link_feedback"]) await raw(`/rest/v1/${t}?student_id=eq.${sid}`, "DELETE");

const nutriA = "dual.pro.demo@morphytest.app", nutriB = "vacio.nutri.demo@morphytest.app";
const student = await asUser(studentEmail);
const linkTo = async (proEmail, disciplina = "nutricion") => {
  const pro = await asUser(proEmail);
  const code = (await pro.rpc("generate_trainer_invite_code", { p_disciplina: disciplina })).json;
  const req = await student.rpc("request_trainer_link", { p_code: code });
  if (!req.ok) return { ok: false, err: JSON.stringify(req.json) };
  const reqs = (await raw(`/rest/v1/trainer_link_requests?select=id&student_id=eq.${sid}&disciplina=eq.${disciplina}&status=eq.pendiente`)).json;
  const resp = await pro.rpc("respond_trainer_link_request", { p_request_id: reqs[0].id, p_decision: "aceptada" });
  return { ok: resp.ok, err: JSON.stringify(resp.json) };
};
const lockRow = async () => (await raw(`/rest/v1/student_link_locks?select=*&student_id=eq.${sid}`)).json?.[0];
const activeLink = async () => (await raw(`/rest/v1/trainer_links?select=trainer_email&student_id=eq.${sid}&disciplina=eq.nutricion&status=eq.activo`)).json?.[0];

// 1. primer vínculo: sin bloqueo
let r = await linkTo(nutriA);
check("primer vínculo a nutricionista A", r.ok, r.err);
check("primer vínculo NO genera bloqueo", !(await lockRow()));

// 2. desvincularse (sin bloqueo vigente) -> historial
const del1 = await student.del(`/trainer_links?student_id=eq.${sid}&disciplina=eq.nutricion`);
check("puede desvincularse sin bloqueo", del1.ok, del1.json?.message);
const hist = (await raw(`/rest/v1/trainer_link_history?select=ended_by,disciplina&student_id=eq.${sid}`)).json;
check("queda en el historial, terminado por el alumno", hist?.length === 1 && hist[0].ended_by === "alumno", JSON.stringify(hist));

// 3. calificar (cliente -> profesional)
const fb = await student.post("/link_feedback", { student_id: sid, trainer_id: users.find((u) => u.email === nutriA).id, disciplina: "nutricion", author_role: "alumno", stars: 4, comentario: "Test", momento: "desvinculacion" });
check("el cliente puede calificar al profesional (estrellas)", fb.ok, fb.json?.message);

// 4. vincularse a otro del MISMO tipo -> bloqueo de 14 días
r = await linkTo(nutriB);
check("vínculo nuevo a nutricionista B", r.ok, r.err);
const lock = await lockRow();
const days = lock ? Math.round((new Date(lock.locked_until) - Date.now()) / 86400000) : null;
check("el cambio (mismo tipo) bloquea 14 días", days === 14, `días de bloqueo: ${days}`);

// 5. intentar volver a cambiar -> debe fallar
const del2 = await student.del(`/trainer_links?student_id=eq.${sid}&disciplina=eq.nutricion`);
check("NO puede desvincularse durante el bloqueo", !del2.ok, del2.json?.message);
check("el vínculo sigue activo", (await activeLink())?.trainer_email === nutriB);

// 6. el cliente no ve la calificación privada del profesional
const pro = await asUser(nutriB);
const rate = await pro.post("/link_feedback", { student_id: sid, trainer_id: users.find((u) => u.email === nutriB).id, disciplina: "nutricion", author_role: "profesional", rating: "bueno", comentario: "Test privado", momento: "mensual" });
check("el profesional puede calificar al cliente (privado)", rate.ok, rate.json?.message);
const seen = (await student.get("/link_feedback?select=author_role,rating")).json || [];
check("el cliente NO ve la calificación del profesional", !seen.some((x) => x.author_role === "profesional"), JSON.stringify(seen));
const proSeen = (await pro.get("/link_feedback?select=author_role,stars,rating")).json || [];
check("el profesional ve sus calificaciones", proSeen.some((x) => x.author_role === "profesional"), JSON.stringify(proSeen));

// limpiar
for (const t of ["trainer_links", "trainer_link_requests", "trainer_link_history", "student_link_locks", "link_feedback"]) await raw(`/rest/v1/${t}?student_id=eq.${sid}`, "DELETE");
console.log(fails === 0 ? "\nTodo OK" : `\n${fails} falla(s)`);
process.exit(fails ? 1 : 0);
