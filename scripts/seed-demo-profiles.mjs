// Seed de cuentas de prueba (@morphytest.app) para cubrir combinaciones de perfiles.
// Idempotente: se puede correr varias veces. Usa SUPABASE_SERVICE_ROLE_KEY de .env.local
// solo para crear usuarios/ajustes; los vínculos, reportes y hogar pasan por las RPCs reales
// iniciando sesión como cada usuario (así se prueba el mismo camino que la app).
//
//   node scripts/seed-demo-profiles.mjs
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = "Demo1234!";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

async function api(path, { method = "GET", headers = admin, body, prefer } = {}) {
  const res = await fetch(URL_ + path, {
    method, headers: prefer ? { ...headers, Prefer: prefer } : headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return json;
}

async function ensureUser(email) {
  const list = await api("/auth/v1/admin/users?per_page=1000");
  let u = list.users.find((x) => x.email === email);
  if (u) {
    await api(`/auth/v1/admin/users/${u.id}`, { method: "PUT", body: { password: PASSWORD, email_confirm: true } });
  } else {
    u = await api("/auth/v1/admin/users", { method: "POST", body: { email, password: PASSWORD, email_confirm: true } });
  }
  return u.id;
}

async function asUser(email) {
  const r = await api("/auth/v1/token?grant_type=password", {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: { email, password: PASSWORD },
  });
  const h = { apikey: ANON, Authorization: `Bearer ${r.access_token}`, "Content-Type": "application/json" };
  return { rpc: (fn, args) => api(`/rest/v1/rpc/${fn}`, { method: "POST", headers: h, body: args ?? {} }) };
}

const PROFILE = { actual: "75", meta: "70", altura: "172", edad: "30", sexo: "hombre", fecha: "2026-12-31", modo: "perder" };

async function setup(email, plan) {
  const id = await ensureUser(email);
  await api("/rest/v1/user_settings?on_conflict=user_id", {
    method: "POST", prefer: "resolution=merge-duplicates",
    body: { user_id: id, plan, calculator_profile: PROFILE, tour_done: true },
  });
  return id;
}

async function approvePro(id, email, disciplina, maxStudents = 12) {
  await api("/rest/v1/trainer_applications?on_conflict=user_id,disciplina", {
    method: "POST", prefer: "resolution=merge-duplicates",
    body: { user_id: id, user_email: email, disciplina, certificate_path: "demo/seed.pdf", status: "aprobado",
      trainer_plan: "pago", max_students: maxStudents },
  });
}

async function link(studentEmail, proEmail, disciplina) {
  const pro = await asUser(proEmail);
  const student = await asUser(studentEmail);
  const code = await pro.rpc("generate_trainer_invite_code", { p_disciplina: disciplina });
  await student.rpc("request_trainer_link", { p_code: code });
  const reqs = await api(`/rest/v1/trainer_link_requests?select=id&student_id=eq.${(await idOf(studentEmail))}&disciplina=eq.${disciplina}&status=eq.pendiente`);
  await pro.rpc("respond_trainer_link_request", { p_request_id: reqs[0].id, p_decision: "aceptada" });
}

async function idOf(email) {
  const list = await api("/auth/v1/admin/users?per_page=1000");
  return list.users.find((x) => x.email === email).id;
}

async function isLinked(studentId, disciplina) {
  const r = await api(`/rest/v1/trainer_links?select=status&student_id=eq.${studentId}&disciplina=eq.${disciplina}&status=eq.activo`);
  return r.length > 0;
}

const E = {
  dual: "dual.pro.demo@morphytest.app",
  alumnoDual: "alumno.dual.demo@morphytest.app",
  alumnoFuerza: "alumno.fuerza.demo@morphytest.app",
  basico: "basico.demo@morphytest.app",
  vacioEntr: "vacio.entrenador.demo@morphytest.app",
  vacioNutri: "vacio.nutri.demo@morphytest.app",
  hogarA: "hogar.a.demo@morphytest.app",
  hogarB: "hogar.b.demo@morphytest.app",
};

// (1) Profesional con las dos aprobaciones, con un paciente en ambas disciplinas y otro solo de fuerza.
const dualId = await setup(E.dual, "premium_plus");
await approvePro(dualId, E.dual, "fuerza");
await approvePro(dualId, E.dual, "nutricion");
const adId = await setup(E.alumnoDual, "premium_plus");
const afId = await setup(E.alumnoFuerza, "premium");
for (const d of ["fuerza", "nutricion"]) if (!(await isLinked(adId, d))) await link(E.alumnoDual, E.dual, d);
if (!(await isLinked(afId, "fuerza"))) await link(E.alumnoFuerza, E.dual, "fuerza");

// (5) Plan Básico real.
await setup(E.basico, "basico");

// (6) Profesionales sin vinculados.
const ve = await setup(E.vacioEntr, "premium");
await approvePro(ve, E.vacioEntr, "fuerza");
const vn = await setup(E.vacioNutri, "premium");
await approvePro(vn, E.vacioNutri, "nutricion");

// (4) Contenido: comentarios, incidencias y reportes del profesional dual hacia sus alumnos.
const comments = await api(`/rest/v1/trainer_comments?select=id&trainer_id=eq.${dualId}`);
if (comments.length === 0) {
  await api("/rest/v1/trainer_comments", { method: "POST", body: [
    { trainer_id: dualId, student_id: adId, texto: "Buen arranque de semana. Subí 2,5 kg en sentadilla si te sentís cómodo." },
    { trainer_id: dualId, student_id: adId, texto: "Acordate de sumar proteína en la merienda, estás un 15% abajo del objetivo." },
    { trainer_id: dualId, student_id: afId, texto: "Te vi flojo de descanso entre series, respetá los 90 segundos." },
  ] });
}
const today = new Date().toISOString().slice(0, 10);
const incs = await api(`/rest/v1/routine_incidents?select=id&trainer_id=eq.${dualId}`);
if (incs.length === 0) {
  await api("/rest/v1/routine_incidents", { method: "POST", body: [
    { student_id: adId, trainer_id: dualId, fecha: today, routine_id: "demo-rutina-a", routine_nombre: "Día A", tipo: "omitido", ejercicio_nombre: "Peso muerto rumano", detalle: "Me dolía la espalda baja." },
    { student_id: adId, trainer_id: dualId, fecha: today, routine_id: "demo-rutina-a", routine_nombre: "Día A", tipo: "serie_adicional", ejercicio_nombre: "Press banca", detalle: "Hice una serie extra." },
    { student_id: afId, trainer_id: dualId, fecha: today, routine_id: "demo-rutina-b", routine_nombre: "Día B", tipo: "comentario_final", ejercicio_nombre: null, detalle: "Sesión larga, salí cansado." },
  ] });
}
const dualPro = await asUser(E.dual);
const monday = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();
for (const [sid, disc] of [[adId, "fuerza"], [adId, "nutricion"], [afId, "fuerza"]]) {
  let repId;
  try {
    repId = await dualPro.rpc("generate_student_report", { p_student_id: sid, p_period_start: monday, p_disciplina: disc });
  } catch (e) {
    console.warn("Reporte omitido (¿falta correr migration_2026-10-03?):", String(e.message).slice(0, 160));
    continue;
  }
  await api(`/rest/v1/reports?id=eq.${repId}`, { method: "PATCH", body: {
    status: "enviado", sent_at: new Date().toISOString(), trainer_comment: "Semana pareja, sigamos así.",
  } });
}

// (3) Hogar compartido: A crea la alacena con algunos productos, B se une con el código.
const hA = await setup(E.hogarA, "premium");
const hB = await setup(E.hogarB, "premium");
const memberships = await api(`/rest/v1/household_members?select=household_id&user_id=eq.${hA}`);
if (memberships.length === 0) {
  const a = await asUser(E.hogarA);
  const hid = await a.rpc("create_household", { p_name: "Hogar demo", p_import_items: [
    { name: "Arroz", quantity: 1000, unit: "g", category: "cereales" },
    { name: "Huevo", quantity: 12, unit: "u", category: "proteinas" },
    { name: "Leche", quantity: 1000, unit: "ml", category: "lacteos" },
  ] });
  const code = await a.rpc("generate_invite_code", { p_household_id: hid });
  const b = await asUser(E.hogarB);
  await b.rpc("join_household", { p_code: code });
}

console.log(`Listo. Contraseña de todas: ${PASSWORD}\n` + Object.values(E).join("\n"));
