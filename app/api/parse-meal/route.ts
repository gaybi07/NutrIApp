import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Sos un nutricionista argentino calculando kcal, proteína, carbohidratos y grasas de una comida a partir de una descripción en lenguaje natural, a veces dictada por voz (puede tener errores de dictado, corregilos si son obvios, y puede ser larga o tener detalles de más).
Reglas:
- Usá SIEMPRE la estimación más realista (punto medio del rango típico), nunca el extremo más alto ni el más bajo.
- Si hay varios alimentos, sumalos todos.
- Si una cantidad no está clara, asumí una porción individual normal.
- "carbs" y "fat" son gramos de carbohidratos y grasas totales de la comida — deben ser consistentes con "kcal" (kcal ≈ protein×4 + carbs×4 + fat×9, con margen razonable).
- "resumen": un título corto (3 a 6 palabras) en español que capture lo esencial de la comida, ignorando aclaraciones menores. Ej: si el texto es un párrafo largo explicando "yogur con mermelada de arándanos, lo hice con leche proteica, con...", el resumen es simplemente "Yogur con mermelada de arándanos".
- "ingredientes": un listado separado por comas de los alimentos con cantidad y unidad, normalizado para descontar de una alacena, formato "<cantidad> <unidad: g/ml/u> <nombre simple del alimento>". Ej: "2 u huevo, 1 u tostada, 30 g queso crema, 1 u banana". Usá nombres simples y genéricos (sin marcas ni adjetivos raros).
- Respondé SOLO con un JSON válido, sin texto adicional, sin backticks, con este formato exacto:
{"kcal": <numero entero>, "protein": <numero entero, gramos>, "carbs": <numero entero, gramos>, "fat": <numero entero, gramos>, "detalle": "<breve desglose de 1 linea, en español>", "resumen": "<titulo corto>", "ingredientes": "<listado para inventario>"}`;

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function extractJson(text: string) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("La IA no devolvió un JSON válido");
  return JSON.parse(clean.slice(start, end + 1));
}

async function parseWithGemini(text: string, apiKey: string) {
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: `Comida: ${text}` }] }],
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
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Falta el texto de la comida" }, { status: 400 });
    }

    if (process.env.GEMINI_API_KEY) {
      return NextResponse.json(await parseWithGemini(text, process.env.GEMINI_API_KEY));
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Configurá GEMINI_API_KEY o ANTHROPIC_API_KEY en .env.local" },
        { status: 503 }
      );
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Comida: ${text}` }],
    });

    const textBlock = msg.content.find((b) => b.type === "text");
    if (!textBlock) return NextResponse.json({ error: "Respuesta vacía del modelo" }, { status: 502 });

    return NextResponse.json(extractJson(textBlock.text));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo calcular la comida" }, { status: 500 });
  }
}
