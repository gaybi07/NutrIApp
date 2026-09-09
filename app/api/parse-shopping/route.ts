import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Sos un asistente que lee tickets de supermercado. Tu trabajo es extraer solo los productos/items comprados a partir de una imagen o texto del ticket.

Reglas:
- Responde SOLO con JSON válido, sin markdown, sin texto extra.
- Formato exacto: {"items": ["item 1", "item 2", "item 3"]}
- Extrae nombres de productos, no precios, no cantidades, no subtotal, no total, no fechas ni datos del local.
- Conserva la cantidad y unidad para inventario, por ejemplo "1 kg pollo", "500 g queso" o "2 unidades huevo".
- Quita precios, subtotales, fechas y datos del local; no quites la cantidad del producto.
- Elimina duplicados.
- Si hay texto irrelevante del ticket, ignoralo.
- Si un item es ambiguo, usa el nombre más claro posible.
- Si no hay productos, devuelve una lista vacía.`;

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function extractJson(text: string) {
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
