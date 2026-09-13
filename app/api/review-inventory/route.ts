import { NextRequest, NextResponse } from "next/server";

const CATEGORIES = "carnes, lacteos, huevos, verduras, frutas, harinas, bebidas, condimentos, otros";

const SYSTEM_PROMPT = `Sos un asistente que limpia el inventario de la alacena de una casa. Te paso una lista de productos con id/nombre/cantidad/unidad tal como quedaron guardados — a veces mal, por errores de un parser de texto anterior: nombres con la cantidad pegada adelante ("kilos de milanesa de pollo" en vez de "milanesa de pollo"), palabras truncadas ("itro de leche" en vez de "litro de leche", "imón" en vez de "limón"), o cantidades sin convertir (2 "kilos" guardados como cantidad 2 en vez de 2000 gramos).

Para CADA item de la lista de entrada (conservando su "id" tal cual), devolvé:
- "id": el mismo id que te pasaron para ese item.
- "nombre": corregido y limpio — simple, singular, sin cantidad ni unidad pegada (ej. "milanesa de pollo", no "kilos de milanesa de pollo"; "leche", no "itro de leche"; "limón", no "imón"). Si ya estaba bien, dejalo igual.
- "cantidad" y "unidad": la cantidad real en gramos ("g"), mililitros ("ml") o unidades ("u.") — si el nombre/cantidad original indicaban "2 kilos", la cantidad correcta es 2000 con unidad "g"; si eran "3 litros", 3000 con unidad "ml". Si ya estaba bien convertido, dejalo igual.
- "categoria": la más apropiada de esta lista exacta (en minúscula, tal cual): ${CATEGORIES}.
- "nutricion100g": valores típicos y realistas de ese alimento por cada 100g o 100ml (o por unidad si "unidad" es "u.", ej. 1 huevo) — punto medio del rango típico, gramos enteros: {"kcal": <int>, "protein": <int>, "carbs": <int>, "fat": <int>, "fiber": <int>}.

Respondé SOLO con JSON válido, sin markdown, sin texto extra, con este formato exacto:
{"items": [{"id": "<string>", "nombre": "<string>", "cantidad": <numero>, "unidad": "g"|"ml"|"u.", "categoria": "<string>", "nutricion100g": {"kcal": <int>, "protein": <int>, "carbs": <int>, "fat": <int>, "fiber": <int>}}]}`;

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

export type ReviewedInventoryItem = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: "g" | "ml" | "u.";
  categoria: string;
  nutricion100g?: { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
};

function extractJson(text: string): { items: ReviewedInventoryItem[] } {
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

async function reviewWithGemini(items: Array<{ id: string; name: string; quantity: number; unit: string }>, apiKey: string) {
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: `Items: ${JSON.stringify(items)}` }] }],
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
    const { items } = body as { items?: Array<{ id: string; name: string; quantity: number; unit: string }> };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No hay productos para revisar" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Falta GEMINI_API_KEY para revisar el inventario" }, { status: 503 });
    }

    const reviewed = await reviewWithGemini(items, process.env.GEMINI_API_KEY);
    return NextResponse.json(reviewed);
  } catch (error) {
    console.error("Error revisando inventario:", error);
    return NextResponse.json({ error: "No pude revisar el inventario. Probá de nuevo en un rato." }, { status: 500 });
  }
}
