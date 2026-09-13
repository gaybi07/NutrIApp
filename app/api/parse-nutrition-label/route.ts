import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const SYSTEM_PROMPT = `Sos un asistente que lee la tabla de información nutricional impresa en el envase de un producto, a partir de una foto.

Te paso el nombre del producto y la unidad en la que se guarda en un inventario de alacena: "g" (se pesa en gramos), "ml" (se mide en mililitros) o "u." (se cuenta por unidad individual, ej. 1 alfajor, 1 yogur).

Leé la tabla nutricional de la foto (suele decir "Información nutricional", con columnas "por 100 g"/"por 100 ml" y/o "por porción") y devolveme los valores YA CONVERTIDOS a la base que corresponde según la unidad:
- Si la unidad es "g" o "ml": los valores por cada 100 g o 100 ml.
- Si la unidad es "u.": los valores por UNA sola unidad/porción individual del producto (fijate el tamaño de porción de la etiqueta — si la etiqueta ya da valores "por porción" y esa porción es 1 unidad del producto, usá esos directo; si no, convertí desde la base de 100g/100ml al peso real de 1 unidad).

Respondé SOLO con JSON válido, sin markdown, sin texto extra, con este formato exacto:
{"kcal": <entero>, "protein": <entero, gramos>, "carbs": <entero, gramos>, "fat": <entero, gramos>, "fiber": <entero, gramos>}

Si la foto no muestra una tabla de información nutricional legible, respondé exactamente: {"error": "No encontré una tabla de información nutricional legible en la foto"}`;

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

async function readLabelWithGemini(imageDataUrl: string, name: string, unit: string) {
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  if (!match) throw new Error("La imagen no tiene un formato válido");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            parts: [
              { text: `Producto: ${name || "(sin nombre)"}. Unidad del inventario: ${unit}.` },
              { inline_data: { mime_type: match[1], data: match[2] } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
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
    const { imageDataUrl, name, unit } = body as { imageDataUrl?: string; name?: string; unit?: string };

    if (!imageDataUrl) {
      return NextResponse.json({ error: "Falta la foto de la etiqueta" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Falta GEMINI_API_KEY para leer etiquetas" }, { status: 503 });
    }

    const parsed = await readLabelWithGemini(imageDataUrl, name || "", unit || "g");
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Error leyendo etiqueta nutricional:", error);
    return NextResponse.json({ error: "No pude leer la etiqueta. Probá con otra foto o cargalo a mano." }, { status: 500 });
  }
}
