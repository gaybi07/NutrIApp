// Cuentas de prueba que faltaban para la revisión perfil por perfil: Premium + Entrenador y Autoentreno.
// Idempotente: se puede correr varias veces. Usa SUPABASE_SERVICE_ROLE_KEY de .env.local
// solo para crear usuarios/ajustes; los vínculos, reportes y hogar pasan por las RPCs reales
// iniciando sesión como cada usuario (así se prueba el mismo camino que la app).
//
//   node scripts/seed-cuentas-faltantes.mjs
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
  premiumEntrenador: "premium.entrenador.demo@morphytest.app",
  autoentreno: "autoentreno.demo@morphytest.app",
  entrenador: "entrenador.demo@morphytest.app",
};

// (3) Premium con un Entrenador vinculado (y sin Nutricionista).
const pe = await setup(E.premiumEntrenador, "premium");
if (!(await isLinked(pe, "fuerza"))) {
  // Vínculo directo (service role): la contraseña de entrenador.demo no es la de las cuentas sembradas.
  const trainerId = await idOf(E.entrenador);
  await api("/rest/v1/trainer_links", {
    method: "POST", prefer: "return=minimal",
    body: { student_id: pe, trainer_id: trainerId, trainer_email: E.entrenador, student_email: E.premiumEntrenador, disciplina: "fuerza", status: "activo" },
  });
}
console.log("Premium + Entrenador:", E.premiumEntrenador, "(vinculado a", E.entrenador + ")");

// (5) Autoentreno: sin profesionales, plan armado por él mismo.
await setup(E.autoentreno, "autoentreno");
console.log("Autoentreno:", E.autoentreno);
console.log("Contraseña de las dos:", PASSWORD);
