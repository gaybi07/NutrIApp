// Sube a mano el ticket del supermercado (Vea, factura B, total $172.995,30) a la Alacena compartida "Casita Gabi y Fla"
// y al historial de compras compartido. Los productos que ya existen suman a la cantidad; los nuevos se crean con una
// estimación nutricional SIN confirmar (para revisar). Guarda una copia de lo que modifica en backups/.
// Uso: node scripts/subir-ticket-2026-10-03.mjs [--simular]
import fs from "fs";

const simular = process.argv.includes("--simular");
const HOUSEHOLD = "e501b57a-d575-48f5-aaf4-2abad6dccd75";
const FECHA = "2026-10-03";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const api = async (p, m = "GET", b) => {
  const r = await fetch(U + p, { method: m, headers: { ...H, Prefer: "return=minimal" }, body: b === undefined ? undefined : JSON.stringify(b) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
};
const n = (kcal, protein, carbs, fat, fiber = 0) => ({ kcal, protein, carbs, fat, fiber });

// name = nombre en la Alacena · cantidad comprada · cat · nutrición cada 100 g/ml (o por unidad si u.) · zona (solo si es nuevo)
// compras = renglones del historial: [nombre, cantidad, unidad, marca, precio con descuento]
const ITEMS = [
  { name: "gatorade frutas tropicales", qty: 2500, unit: "ml", cat: "bebidas", nut: n(24, 0, 6, 0), zona: "flotante", compras: [["gatorade frutas tropicales", 2500, "ml", "Gatorade", 4698]] },
  { name: "gatorade cool blue", qty: 2500, unit: "ml", cat: "bebidas", nut: n(24, 0, 6, 0), zona: "flotante", compras: [["gatorade cool blue", 2500, "ml", "Gatorade", 4698]] },
  { name: "avena", qty: 750, unit: "g", cat: "harinas", nut: n(380, 13, 63, 7, 10), zona: "bajomesada", compras: [["avena", 350, "g", "Cadea", 1990], ["avena", 400, "g", "Morixe", 2000]] },
  { name: "pimentón dulce", qty: 50, unit: "g", cat: "condimentos", nut: n(282, 14, 54, 13, 35), zona: "bajomesada", compras: [["pimentón dulce", 50, "g", null, 2500]] },
  { name: "pimienta en grano", qty: 100, unit: "g", cat: "condimentos", nut: n(251, 10, 64, 3, 25), zona: "bajomesada", compras: [["pimienta en grano", 100, "g", null, 4700]] },
  { name: "manteca", qty: 200, unit: "g", cat: "lacteos", nut: n(717, 1, 0, 81), zona: "heladera", compras: [["manteca", 200, "g", "Tonadita", 4390]] },
  { name: "gaseosa cola sin azúcar", qty: 10000, unit: "ml", cat: "bebidas", nut: n(0, 0, 0, 0), zona: "flotante", compras: [["gaseosa cola sin azúcar", 10000, "ml", "Coca-Cola", 17400]] },
  { name: "café en saquitos", qty: 1, unit: "u.", cat: "bebidas", nut: n(2, 0, 0, 0), zona: "bajomesada", compras: [["café en saquitos", 1, "u.", "Bonafide", 4990]] },
  { name: "yogur griego natural sin endulzar", qty: 300, unit: "g", cat: "lacteos", nut: n(60, 9, 4, 0.5), zona: "heladera", compras: [["yogur griego natural sin endulzar", 300, "g", "Yogurísimo", 3178.5]] },
  { name: "queso pategrás", qty: 212, unit: "g", cat: "lacteos", nut: n(350, 25, 1, 28), zona: "heladera", compras: [["queso pategrás", 212, "g", "Cuisine&Co", 5914.8]] },
  { name: "jamón cocido", qty: 190, unit: "g", cat: "proteina_animal", nut: n(110, 18, 1, 4), zona: "heladera", compras: [["jamón cocido", 190, "g", "Cuisine&Co", 4921]] },
  { name: "pan blanco", qty: 630, unit: "g", cat: "harinas", nut: n(260, 8, 49, 3, 3), zona: "bajomesada", compras: [["pan blanco", 630, "g", "Lactal", 4980]] },
  { name: "chocolate cofler tableta", qty: 55, unit: "g", cat: "otros", nut: n(540, 6, 58, 31, 3), zona: "bajomesada", compras: [["chocolate cofler tableta", 55, "g", "Cofler", 2634]] },
  { name: "chocolate cofler yogurt frutilla", qty: 1, unit: "u.", cat: "otros", nut: n(150, 2, 17, 8), zona: "bajomesada", compras: [["chocolate cofler yogurt frutilla", 1, "u.", "Cofler", 2394]] },
  { name: "chocolate kinder con avellanas", qty: 2, unit: "u.", cat: "otros", nut: n(270, 4, 28, 16, 1), zona: "bajomesada", compras: [["chocolate kinder con avellanas", 2, "u.", "Kinder", 3960]] },
  { name: "chocolate milka leche", qty: 150, unit: "g", cat: "otros", nut: n(535, 6.5, 57, 30, 2), zona: "bajomesada", compras: [["chocolate milka leche", 150, "g", "Milka", 6930]] },
  { name: "postre royal vainilla light", qty: 75, unit: "g", cat: "otros", nut: n(330, 2, 80, 1), zona: "bajomesada", compras: [["postre royal vainilla light", 75, "g", "Royal", 1690]] },
  { name: "postre royal chocolate", qty: 50, unit: "g", cat: "otros", nut: n(380, 5, 80, 4, 3), zona: "bajomesada", compras: [["postre royal chocolate", 50, "g", "Royal", 1690]] },
  { name: "gelatina cereza", qty: 75, unit: "g", cat: "otros", nut: n(380, 9, 85, 0), zona: "bajomesada", compras: [["gelatina cereza", 75, "g", "Godet", 2970]] },
  { name: "mostaza", qty: 250, unit: "g", cat: "condimentos", nut: n(80, 4, 6, 4), zona: "bajomesada", compras: [["mostaza", 250, "g", "Savora", 1290]] },
  { name: "yerba mate", qty: 2000, unit: "g", cat: "bebidas", nut: n(0, 0, 0, 0), zona: "bajomesada", compras: [["yerba mate", 2000, "g", "Playadito", 9560]] },
  { name: "salsa de chocolate", qty: 310, unit: "g", cat: "otros", nut: n(300, 3, 60, 5, 2), zona: "bajomesada", compras: [["salsa de chocolate", 310, "g", "Dos Anclas", 5590]] },
  { name: "mix 4 berries", qty: 800, unit: "g", cat: "frutas", nut: n(45, 1, 10, 0.5, 3), zona: "heladera", compras: [["mix 4 berries", 800, "g", "Green Life", 19900]] },
  { name: "yogur griego bebible de frutilla", qty: 900, unit: "g", cat: "lacteos", nut: n(75, 5, 10, 1.5), zona: "heladera", compras: [["yogur griego bebible de frutilla", 900, "g", "Yogurísimo", 4478.5]] },
  { name: "yogur griego bebible de banana", qty: 900, unit: "g", cat: "lacteos", nut: n(75, 5, 10, 1.5), zona: "heladera", compras: [["yogur griego bebible de banana", 900, "g", "Yogurísimo", 4478.5]] },
  { name: "leche proteica", qty: 4000, unit: "ml", cat: "lacteos", nut: n(42, 5.2, 4.6, 0), zona: "bajomesada", compras: [["leche proteica", 4000, "ml", "Las Tres Niñas", 9000]] },
  { name: "té inti zen don juan", qty: 1, unit: "u.", cat: "bebidas", nut: n(1, 0, 0, 0), zona: "bajomesada", compras: [["té inti zen don juan", 1, "u.", "Inti Zen", 5390]] },
  { name: "té inti zen grey", qty: 1, unit: "u.", cat: "bebidas", nut: n(1, 0, 0, 0), zona: "bajomesada", compras: [["té inti zen grey", 1, "u.", "Inti Zen", 5390]] },
  { name: "blend calma andina inti zen", qty: 1, unit: "u.", cat: "bebidas", nut: n(1, 0, 0, 0), zona: "bajomesada", compras: [["blend calma andina inti zen", 1, "u.", "Inti Zen", 5390]] },
  { name: "té inti zen blanco lyche", qty: 1, unit: "u.", cat: "bebidas", nut: n(1, 0, 0, 0), zona: "bajomesada", compras: [["té inti zen blanco lyche", 1, "u.", "Inti Zen", 5390]] },
];
// Solo gasto (no van a la Alacena)
const SOLO_GASTO = [
  ["bolsa de cliente Vea", 2, "u.", "Vea", 220],
  ["acondicionador Elvive glyco gloss 200 ml", 2, "u.", "Elvive", 8290],
];

const existentes = await api(`/rest/v1/inventory_items?select=*&household_id=eq.${HOUSEHOLD}`);
const byName = new Map(existentes.map((i) => [i.name.toLowerCase(), i]));
const sumaGasto = ITEMS.flatMap((i) => i.compras).concat(SOLO_GASTO).reduce((s, c) => s + c[4], 0);
console.log(`Total de la compra (con descuentos): $${sumaGasto.toLocaleString("es-AR")}  (ticket: $172.995,30)`);

const aActualizar = [];
const aCrear = [];
for (const it of ITEMS) {
  const ex = byName.get(it.name.toLowerCase());
  if (ex) {
    if (ex.unit !== it.unit) throw new Error(`Unidad distinta en ${it.name}: ${ex.unit} vs ${it.unit}`);
    aActualizar.push({ ex, nueva: Math.round((Number(ex.quantity) + it.qty) * 10) / 10 });
  } else aCrear.push(it);
}
console.log(`\nSuman a lo que ya había (${aActualizar.length}):`);
for (const { ex, nueva } of aActualizar) console.log(`  ${ex.name}: ${ex.quantity} ${ex.unit} -> ${nueva} ${ex.unit}`);
console.log(`\nProductos nuevos (${aCrear.length}):`);
for (const it of aCrear) console.log(`  ${it.name}: ${it.qty} ${it.unit} · ${it.cat} · ${it.zona}`);
console.log(`\nHistorial de compras: ${ITEMS.flatMap((i) => i.compras).length + SOLO_GASTO.length} renglones del ${FECHA}.`);

if (simular) {
  console.log("\n[SIMULACIÓN] no se guardó nada.");
  process.exit(0);
}

fs.mkdirSync("backups", { recursive: true });
fs.writeFileSync("backups/alacena-compartida-antes-ticket-2026-10-03.json", JSON.stringify(aActualizar.map((a) => a.ex), null, 2));
for (const { ex, nueva } of aActualizar) {
  await api(`/rest/v1/inventory_items?id=eq.${ex.id}`, "PATCH", { quantity: nueva, updated_at: new Date().toISOString() });
}
if (aCrear.length > 0) {
  await api(
    "/rest/v1/inventory_items",
    "POST",
    aCrear.map((it) => ({ household_id: HOUSEHOLD, name: it.name, quantity: it.qty, unit: it.unit, category: it.cat, nutrition_per_100g: it.nut, nutrition_confirmed: false, zona: it.zona }))
  );
}
const compras = ITEMS.flatMap((i) => i.compras.map((c) => ({ name: c[0], quantity: c[1], unit: c[2], brand: c[3], price: c[4], category: i.cat })));
for (const c of SOLO_GASTO) compras.push({ name: c[0], quantity: c[1], unit: c[2], brand: c[3], price: c[4], category: "otros" });
await api("/rest/v1/purchase_history", "POST", compras.map((c) => ({ household_id: HOUSEHOLD, fecha: FECHA, ...c })));
console.log("\nGuardado en la Alacena compartida y en el historial de compras.");
