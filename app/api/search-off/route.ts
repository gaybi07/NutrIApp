import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

// Open Food Facts pide identificar la app que llama (nombre + contacto/URL)
// en el User-Agent -- no acepta headers custom desde fetch del browser, por
// eso esto pasa por el servidor en vez de pegarle directo desde el cliente.
const USER_AGENT = "NutrIApp/1.0 (app personal de registro nutricional; https://nutriapp-rose-six.vercel.app)";

// El buscador viejo (cgi/search.pl) devuelve "Page temporarily unavailable"
// -- Open Food Facts lo está reemplazando por este ("search-a-licious").
const SEARCH_URL = "https://search.openfoodfacts.org/search";

type OffHit = {
  product_name?: string;
  brands?: string[];
  quantity?: string;
  nutriments?: Record<string, number>;
  countries_tags?: string[];
};

async function searchOff(query: string): Promise<OffHit[]> {
  const params = new URLSearchParams({
    q: query,
    page_size: "10",
    fields: "product_name,brands,quantity,nutriments,countries_tags",
  });

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error("Open Food Facts no respondió");
  const data = await res.json();
  return Array.isArray(data.hits) ? data.hits : [];
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q) return NextResponse.json({ error: "Falta el texto a buscar" }, { status: 400 });

    const hits = await searchOff(q);

    // El buscador no tiene un filtro de país confiable por query -- en vez
    // de eso, se pide parejo y se reordena acá: los productos marcados
    // Argentina primero, el resto después.
    const sorted = [...hits].sort((a, b) => {
      const aAr = a.countries_tags?.includes("en:argentina") ? 0 : 1;
      const bAr = b.countries_tags?.includes("en:argentina") ? 0 : 1;
      return aAr - bAr;
    });

    const results = sorted
      .filter((p) => p.product_name && p.nutriments && p.nutriments["energy-kcal_100g"] != null)
      .slice(0, 8)
      .map((p) => ({
        name: p.product_name,
        brand: p.brands && p.brands.length > 0 ? p.brands.join(", ") : null,
        quantity: p.quantity || null,
        nutritionPer100g: {
          kcal: Math.round(p.nutriments!["energy-kcal_100g"] || 0),
          protein: Math.round(p.nutriments!["proteins_100g"] || 0),
          carbs: Math.round(p.nutriments!["carbohydrates_100g"] || 0),
          fat: Math.round(p.nutriments!["fat_100g"] || 0),
          fiber: Math.round(p.nutriments!["fiber_100g"] || 0),
        },
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error buscando en Open Food Facts:", error);
    return NextResponse.json({ error: "No pude buscar en Open Food Facts. Probá de nuevo." }, { status: 500 });
  }
}
