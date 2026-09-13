import { NextRequest, NextResponse } from "next/server";

const CATEGORIES = "carnes, lacteos, huevos, verduras, frutas, harinas, bebidas, condimentos, otros";

const SYSTEM_PROMPT = `Sos un asistente que lee tickets de supermercado. Tu trabajo es extraer solo los productos/items comprados a partir de una imagen o texto del ticket, y clasificarlos para un inventario de alacena.

Reglas:
- Respondé SOLO con JSON válido, sin markdown, sin texto extra.
- Formato exacto: {"items": [{"nombre": "<string>", "cantidad": <numero>, "unidad": "g"|"ml"|"u.", "categoria": "<una de: ${CATEGORIES}>", "nutricion100g": {"kcal": <int>, "protein": <int>, "carbs": <int>, "fat": <int>, "fiber": <int>} | null}]}
- "nombre": limpio, simple, singular, sin cantidad ni unidad pegada (ej. "pollo", no "1 kg pollo" ni "kilo de pollo").
- "cantidad" y "unidad": convertí SIEMPRE a gramos ("g"), mililitros ("ml") o unidades ("u.") — si el ticket dice "2 kg" son 2000 "g"; si dice "1 litro" o "1 lt" son 1000 "ml". Si el producto es un envase (caja/botella/frasco/pote/paquete/lata/bolsa/sachet) sin peso/volumen impreso, no pongas "1 g"/"1 ml" — usá el tamaño real típico de ESE producto en Argentina (ej: botella de aceite ≈ 900-1000 ml, caja/sachet de leche ≈ 1000 ml, pote de yogur ≈ 200 g, pote de dulce de leche ≈ 400 g, paquete de fideos/arroz/harina ≈ 500 g, lata de atún ≈ 170 g) y sacá la palabra del envase del "nombre". Si de verdad no hay forma de estimar cantidad, asumí 1 "u.".
- "categoria": elegí la más apropiada de esta lista exacta (en minúscula, tal cual): ${CATEGORIES}.
- "nutricion100g": OJO con la base según "unidad" — si "unidad" es "g" o "ml", son los valores por cada 100 g o 100 ml (NUNCA por el total de "cantidad"); si "unidad" es "u.", son los valores por UNA sola unidad del producto (ej. 1 huevo, 1 alfajor, 1 yogur individual — no por 100 unidades ni por el paquete entero). Solo poné un valor si estás razonablemente seguro de ese producto puntual (marca/tipo conocido) — si es un producto de nicho, una marca rara, o la cantidad/tipo no te da para estimar bien, poné directamente "nutricion100g": null en vez de inventar un número — se le va a pedir al usuario que lo complete a mano o con una foto de la etiqueta.
- Extrae nombres de productos, no precios, no subtotal, no total, no fechas ni datos del local.
- Elimina duplicados (sumá cantidades si aparece repetido).
- Si hay texto irrelevante del ticket, ignoralo.
- Si un item es ambiguo, usa el nombre más claro posible.
- Si no hay productos, devolvé una lista vacía.`;

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

export type ParsedShoppingItem = {
  nombre: string;
  cantidad: number;
  unidad: "g" | "ml" | "u.";
  categoria: string;
  nutricion100g?: { kcal: number; protein: number; carbs: number; fat: number; fiber: number } | null;
};

function extractJson(text: string): { items: ParsedShoppingItem[] } {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("La IA no devolvió un JSON válido");
  const parsed = JSON.parse(clean.slice(start, end + 1));
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error("La IA no devolvió una lista de items válida");
  }
  return parsed;
}

async function parseWithGemini(text: string, imageDataUrl?: string) {
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
    { text: `Instrucción: ${SYSTEM_PROMPT}` },
    { text: text ? `Texto del ticket: ${text}` : "Leé el ticket y extraé solo los productos comprados." },
  ];

  if (imageDataUrl) {
    const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (!match) throw new Error("La imagen no tiene un formato válido");
    parts.push({
      inline_data: {
        mime_type: match[1],
        data: match[2],
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    }
  );

  const data = (await response.json()) as GeminiResponse & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || "Gemini rechazó la solicitud");

  const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!result) throw new Error("Gemini no devolvió una respuesta");
  return extractJson(result);
}

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

    const parsed = await parseWithGemini(text || "", imageDataUrl);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Error parseando ticket:", error);
    return NextResponse.json({ error: "No pude leer el ticket. Probá pegar el texto o cargarlo manualmente." }, { status: 500 });
  }
}
