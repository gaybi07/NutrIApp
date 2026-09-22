import { NextRequest, NextResponse } from "next/server";
import { callGeminiJson, GeminiRateLimitError } from "@/lib/geminiClient";

// Le pide a la plataforma más tiempo que el default (10s en Vercel Hobby)
// para las tandas más lentas — no hace nada si el plan no lo permite, pero
// no molesta dejarlo.
export const maxDuration = 30;

const CATEGORIES = "proteina_animal, proteina_vegetal, lacteos, verduras, frutas, harinas, bebidas, condimentos, otros";

const SYSTEM_PROMPT = `Sos un asistente que limpia el inventario de la alacena de una casa. Te paso una lista de productos con id/nombre/cantidad/unidad tal como quedaron guardados — a veces mal, por errores de un parser de texto anterior:
- Nombres con la cantidad pegada adelante ("kilos de milanesa de pollo" en vez de "milanesa de pollo").
- Palabras truncadas ("itro de leche" en vez de "litro de leche", "imón" en vez de "limón").
- Cantidades sin convertir (2 "kilos" guardados como cantidad 2 en vez de 2000 gramos).
- Envases pegados al nombre con cantidad "1" sin sentido, tipo 1 gramo o 1 mililitro ("botella de aceite" x 1 "g", "pote de queso blanco" x 1 "g", "cajas de leche" x 4 "ml") — para estos, sacá la palabra del envase (caja/botella/frasco/pote/paquete/lata/bolsa/sachet) del nombre y convertí a la cantidad real que contiene ESE producto en particular, usando tu conocimiento de envases típicos en Argentina (ej: una botella de aceite ≈ 900-1000 ml; una caja/sachet de leche ≈ 1000 ml; un pote de yogur ≈ 200 g; un pote de dulce de leche ≈ 400 g; un paquete de fideos/arroz/harina ≈ 500 g; una lata de atún ≈ 170 g) — no dejes cantidades de "1 g"/"1 ml" para un envase entero, son casi siempre un error.

Para CADA item de la lista de entrada (conservando su "id" tal cual), devolvé:
- "id": el mismo id que te pasaron para ese item.
- "nombre": corregido y limpio — simple, singular, sin cantidad, unidad ni envase pegado (ej. "milanesa de pollo", no "kilos de milanesa de pollo"; "leche", no "itro de leche"; "limón", no "imón"; "aceite", no "botella de aceite"). Si ya estaba bien, dejalo igual.
- "cantidad" y "unidad": la cantidad real en gramos ("g"), mililitros ("ml") o unidades ("u.") — si el nombre/cantidad original indicaban "2 kilos", la cantidad correcta es 2000 con unidad "g"; si eran "3 litros", 3000 con unidad "ml"; si era un envase con cantidad "1 g"/"1 ml" sin sentido, corregilo al tamaño real típico de ese envase (ver arriba). Revisá también la UNIDAD en sí, no solo la cantidad: si el producto en realidad se cuenta (alfajor, huevo, factura, empanada, medialuna, sandwich, yogur individual, etc.) pero quedó guardado en gramos o mililitros, corregí la unidad a "u." y la cantidad al número de unidades que corresponda. Si ya estaba todo bien, dejalo igual.
- "categoria": la más apropiada de esta lista exacta (en minúscula, tal cual): ${CATEGORIES}. "proteina_animal" es carnes, pescado, huevos y fiambres; "proteina_vegetal" es legumbres (lentejas, garbanzos, porotos), tofu, seitan y soja.
- "nutricion100g": OJO con la base según "unidad" — si "unidad" es "g" o "ml", son los valores por cada 100 g o 100 ml (NUNCA por el total de "cantidad"); si "unidad" es "u.", son los valores por UNA sola unidad del producto (ej. 1 huevo, 1 alfajor — no por 100 unidades). Dale prioridad a estimar: para la enorme mayoría de alimentos comunes (carnes, lácteos, verduras, frutas, harinas, fiambres, snacks típicos, etc.) podés dar un valor realista con tu conocimiento general aunque no sepas la marca exacta — usá "nutricion100g": null solo para productos realmente imposibles de estimar (una marca/producto muy de nicho, un nombre demasiado ambiguo para saber de qué se trata). Ante la duda, estimá; no dejes null por las dudas.

Respondé SOLO con JSON válido, sin markdown, sin texto extra, con este formato exacto:
{"items": [{"id": "<string>", "nombre": "<string>", "cantidad": <numero>, "unidad": "g"|"ml"|"u.", "categoria": "<string>", "nutricion100g": {"kcal": <int>, "protein": <int>, "carbs": <int>, "fat": <int>, "fiber": <int>} | null}]}`;

export type ReviewedInventoryItem = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: "g" | "ml" | "u.";
  categoria: string;
  nutricion100g?: { kcal: number; protein: number; carbs: number; fat: number; fiber: number } | null;
};

/** Mismo pedido, contra Claude en vez de Gemini -- respaldo cuando Gemini
 * está saturado (mismo patrón que parse-meal/parse-shopping). */
async function reviewWithAnthropic(items: Array<{ id: string; name: string; quantity: number; unit: string }>, apiKey: string) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Items: ${JSON.stringify(items)}` }],
  });
  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Respuesta vacía del modelo");
  const clean = textBlock.text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("La IA no devolvió un JSON válido");
  return JSON.parse(clean.slice(start, end + 1));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body as { items?: Array<{ id: string; name: string; quantity: number; unit: string }> };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No hay productos para revisar" }, { status: 400 });
    }

    let reviewed: { items?: ReviewedInventoryItem[] } | null = null;

    // Gemini primero (gratis); si está saturado o falla y hay una key de
    // Anthropic configurada, cae ahí en vez de fallar directo -- dos
    // proveedores distintos como respaldo mutuo (mismo patrón que parse-meal).
    if (process.env.GEMINI_API_KEY) {
      try {
        reviewed = (await callGeminiJson(SYSTEM_PROMPT, [{ text: `Items: ${JSON.stringify(items)}` }])) as { items?: ReviewedInventoryItem[] };
      } catch (geminiError) {
        if (!process.env.ANTHROPIC_API_KEY) {
          if (geminiError instanceof GeminiRateLimitError) {
            return NextResponse.json(
              { error: "La IA está saturada — parece que hay mucha gente usándola a la vez. Esperá un minuto y probá de nuevo." },
              { status: 429 }
            );
          }
          throw geminiError;
        }
        console.error("Gemini falló revisando el inventario, cayendo a Anthropic:", geminiError);
      }
    }

    if (!reviewed) {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: "Configurá GEMINI_API_KEY o ANTHROPIC_API_KEY en .env.local" }, { status: 503 });
      }
      reviewed = (await reviewWithAnthropic(items, process.env.ANTHROPIC_API_KEY)) as { items?: ReviewedInventoryItem[] };
    }

    if (!reviewed || !Array.isArray(reviewed.items)) {
      throw new Error("La IA no devolvió una lista de items válida");
    }
    return NextResponse.json(reviewed);
  } catch (error) {
    console.error("Error revisando inventario:", error);
    if (error instanceof GeminiRateLimitError) {
      return NextResponse.json(
        { error: "La IA está saturada — parece que hay mucha gente usándola a la vez. Esperá un minuto y probá de nuevo." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "No pude revisar el inventario. Probá de nuevo en un rato." }, { status: 500 });
  }
}
