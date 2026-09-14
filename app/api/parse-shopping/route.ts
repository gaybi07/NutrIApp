import { NextRequest, NextResponse } from "next/server";
import { callGeminiJson, GeminiRateLimitError } from "@/lib/geminiClient";

export const maxDuration = 30;

const CATEGORIES = "proteina_animal, proteina_vegetal, lacteos, verduras, frutas, harinas, bebidas, condimentos, otros";

const SYSTEM_PROMPT = `Sos un asistente que lee tickets de supermercado. Tu trabajo es extraer solo los productos/items comprados a partir de una imagen o texto del ticket, y clasificarlos para un inventario de alacena.

Reglas:
- Respondé SOLO con JSON válido, sin markdown, sin texto extra.
- Formato exacto: {"items": [{"nombre": "<string>", "cantidad": <numero>, "unidad": "g"|"ml"|"u.", "categoria": "<una de: ${CATEGORIES}>", "nutricion100g": {"kcal": <int>, "protein": <int>, "carbs": <int>, "fat": <int>, "fiber": <int>} | null, "marca": "<string>" | null, "precio": <numero> | null}]}
- "nombre": limpio, simple, singular, sin cantidad ni unidad pegada (ej. "pollo", no "1 kg pollo" ni "kilo de pollo").
- "cantidad" y "unidad": convertí SIEMPRE a gramos ("g"), mililitros ("ml") o unidades ("u.") — si el ticket dice "2 kg" son 2000 "g"; si dice "1 litro" o "1 lt" son 1000 "ml". Si el producto es un envase (caja/botella/frasco/pote/paquete/lata/bolsa/sachet) sin peso/volumen impreso, no pongas "1 g"/"1 ml" — usá el tamaño real típico de ESE producto en Argentina (ej: botella de aceite ≈ 900-1000 ml, caja/sachet de leche ≈ 1000 ml, pote de yogur ≈ 200 g, pote de dulce de leche ≈ 400 g, paquete de fideos/arroz/harina ≈ 500 g, lata de atún ≈ 170 g) y sacá la palabra del envase del "nombre". Si de verdad no hay forma de estimar cantidad, asumí 1 "u.".
- "categoria": elegí la más apropiada de esta lista exacta (en minúscula, tal cual): ${CATEGORIES}. "proteina_animal" es carnes, pescado, huevos y fiambres; "proteina_vegetal" es legumbres (lentejas, garbanzos, porotos), tofu, seitan y soja.
- "nutricion100g": OJO con la base según "unidad" — si "unidad" es "g" o "ml", son los valores por cada 100 g o 100 ml (NUNCA por el total de "cantidad"); si "unidad" es "u.", son los valores por UNA sola unidad del producto (ej. 1 huevo, 1 alfajor, 1 yogur individual — no por 100 unidades ni por el paquete entero). Dale prioridad a estimar: para la enorme mayoría de alimentos comunes (carnes, lácteos, verduras, frutas, harinas, fiambres, snacks típicos, etc.) podés dar un valor realista con tu conocimiento general aunque no sepas la marca exacta del ticket — usá "nutricion100g": null solo para productos realmente imposibles de estimar (una marca/producto muy de nicho, un nombre demasiado ambiguo para saber de qué se trata). Ante la duda, estimá; no dejes null por las dudas — para lo poco que de verdad no puedas, se le va a pedir al usuario que lo complete a mano o con una foto de la etiqueta.
- "marca": si el ticket/texto menciona una marca reconocible para ese producto (ej. "LA SERENISIMA YOG NAT 190G" → marca "La Serenísima"), extraela separada del nombre genérico. Si no hay marca clara (productos sueltos tipo verdulería, o el ticket no la menciona), dejá null — no inventes una.
- "precio": el precio pagado por ESA línea tal cual figura en el ticket (el importe de esa fila, no el precio unitario si son cosas distintas). Si no hay ticket con precios (ej. el usuario solo dictó/escribió una lista de productos sin plata), dejá null en todos.
- Extrae nombres de productos, marca y precio — ignorá subtotal, total, fecha y datos del local (esas líneas no son productos).
- Elimina duplicados (sumá cantidades si aparece repetido, sumá también el precio de las líneas repetidas).
- Si hay texto irrelevante del ticket, ignoralo.
- Si un item es ambiguo, usa el nombre más claro posible.
- Si no hay productos, devolvé una lista vacía.`;

export type ParsedShoppingItem = {
  nombre: string;
  cantidad: number;
  unidad: "g" | "ml" | "u.";
  categoria: string;
  nutricion100g?: { kcal: number; protein: number; carbs: number; fat: number; fiber: number } | null;
  marca?: string | null;
  precio?: number | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, imageDataUrl } = body as { text?: string; imageDataUrl?: string };

    if (!text && !imageDataUrl) {
      return NextResponse.json({ error: "No hay datos del ticket para leer" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Falta GEMINI_API_KEY para reconocer tickets" }, { status: 503 });
    }

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: text ? `Texto del ticket: ${text}` : "Leé el ticket y extraé solo los productos comprados." },
    ];

    if (imageDataUrl) {
      const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
      if (!match) throw new Error("La imagen no tiene un formato válido");
      parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
    }

    const parsed = (await callGeminiJson(SYSTEM_PROMPT, parts)) as { items?: ParsedShoppingItem[] };
    if (!parsed || !Array.isArray(parsed.items)) {
      throw new Error("La IA no devolvió una lista de items válida");
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Error parseando ticket:", error);
    if (error instanceof GeminiRateLimitError) {
      return NextResponse.json(
        { error: "La IA está saturada — parece que hay mucha gente usándola a la vez. Esperá un minuto y probá de nuevo." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "No pude leer el ticket. Probá pegar el texto o cargarlo manualmente." }, { status: 500 });
  }
}
