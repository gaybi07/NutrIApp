// Alinea las comidas ELEGIDAS (settings.week_plan) de una cuenta con las opciones del plan nutricional actual:
// la semana en curso queda completa con la opción A de cada comida, y se borran elecciones viejas (nombres que ya no
// existen) y las de la semana que viene (para elegirlas en el planificador). No toca comidas cargadas ni pesos.
// Uso: node scripts/realign-weekplan.mjs jgabrielrosa8@gmail.com
import fs from "fs";
const email = process.argv[2];
if (!email) throw new Error("Falta el email");
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const api = async (p, m = "GET", b) => { const r = await fetch(U + p, { method: m, headers: H, body: b === undefined ? undefined : JSON.stringify(b) }); const t = await r.text(); if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t}`); return t ? JSON.parse(t) : null; };
const users = (await api("/auth/v1/admin/users?per_page=1000")).users;
const id = users.find((u) => u.email === email).id;
const WEEKDAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const monday = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const thisMonday = monday(new Date());
const weekStart = fmt(thisMonday);
const [plan] = await api(`/rest/v1/training_plans?select=days&student_id=eq.${id}&disciplina=eq.nutricion&week_start=eq.${weekStart}&status=eq.publicado`);
if (!plan) throw new Error(`No hay plan publicado para la semana ${weekStart}`);
const [st] = await api(`/rest/v1/user_settings?select=week_plan&user_id=eq.${id}`);
const next = {};
let filled = 0;
for (let i = 0; i < 7; i++) {
  const d = new Date(thisMonday); d.setDate(d.getDate() + i);
  const day = plan.days[WEEKDAYS[d.getDay()]];
  if (!day) continue;
  const meals = {};
  for (const meal of ["des", "alm", "mer", "cen", "col"]) if (day[meal]?.[0]) { meals[meal] = day[meal][0].nombre; filled++; }
  next[fmt(d)] = meals;
}
const before = Object.keys(st.week_plan || {}).length;
await api(`/rest/v1/user_settings?user_id=eq.${id}`, "PATCH", { week_plan: next });
console.log(`${email}: elecciones de la semana ${weekStart} alineadas con el plan actual (${filled} comidas). Antes había ${before} fechas; ahora ${Object.keys(next).length}. La semana que viene queda vacía.`);
