// Prueba que days_history guarde la versión anterior de un día al modificarlo / borrarlo (usa una cuenta de prueba).
import fs from "fs";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const api = async (p, m = "GET", b) => { const r = await fetch(U + p, { method: m, headers: H, body: b === undefined ? undefined : JSON.stringify(b) }); const t = await r.text(); return { ok: r.ok, status: r.status, json: t ? JSON.parse(t) : null }; };
let fails = 0;
const check = (n, c, x = "") => { console.log((c ? "OK   " : "FALLA") + " " + n + (x ? " — " + x : "")); if (!c) fails++; };
const id = (await api("/auth/v1/admin/users?per_page=1000")).json.users.find((u) => u.email === "basico.demo@morphytest.app").id;
const fecha = "2026-01-15";
await api(`/rest/v1/days?user_id=eq.${id}&fecha=eq.${fecha}`, "DELETE");
await api(`/rest/v1/days_history?user_id=eq.${id}&fecha=eq.${fecha}`, "DELETE");

const ins = await api("/rest/v1/days", "POST", { user_id: id, fecha, entrenamientos: [{ tipo: "fuerza", minutos: 89, intensidad: "fallo" }], ejercicios: [{ nombre: "Press banca", series: 3, repeticiones: 10, peso: 100 }] });
check("el día de prueba se creó", ins.ok, ins.status);
let hist = (await api(`/rest/v1/days_history?select=*&user_id=eq.${id}&fecha=eq.${fecha}`)).json;
check("crear un día no genera historial", hist.length === 0);

// pisar la sesión (lo que pasó con los 89 min)
await api(`/rest/v1/days?user_id=eq.${id}&fecha=eq.${fecha}`, "PATCH", { entrenamientos: [{ minutos: 60, intensidad: "fallo" }] });
hist = (await api(`/rest/v1/days_history?select=*&user_id=eq.${id}&fecha=eq.${fecha}`)).json;
check("pisar la sesión guarda la versión anterior", hist.length === 1 && hist[0].row.entrenamientos[0].minutos === 89, JSON.stringify(hist[0]?.row?.entrenamientos));

// cambio que no importa (pasos): no genera historial nuevo
await api(`/rest/v1/days?user_id=eq.${id}&fecha=eq.${fecha}`, "PATCH", { pasos: 5000 });
hist = (await api(`/rest/v1/days_history?select=*&user_id=eq.${id}&fecha=eq.${fecha}`)).json;
check("un cambio de pasos no llena el historial", hist.length === 1, `filas: ${hist.length}`);

// borrar el día
await api(`/rest/v1/days?user_id=eq.${id}&fecha=eq.${fecha}`, "DELETE");
hist = (await api(`/rest/v1/days_history?select=*&user_id=eq.${id}&fecha=eq.${fecha}&order=replaced_at`)).json;
check("borrar el día guarda su última versión", hist.length === 2 && hist[1].operacion === "delete", hist.map((h) => h.operacion).join(", "));

await api(`/rest/v1/days_history?user_id=eq.${id}&fecha=eq.${fecha}`, "DELETE");
console.log(fails === 0 ? "\nTodo OK" : `\n${fails} falla(s)`);
process.exit(fails ? 1 : 0);
