import { NextRequest, NextResponse } from "next/server";
import { callGeminiJson, GeminiRateLimitError } from "@/lib/geminiClient";

export const maxDuration = 30;

const SYSTEM_PROMPT = `Sos un asistente que lee la tabla de información nutricional impresa en el envase de un producto, a partir de una foto.

Te paso el nombre del producto y la unidad en la que se guarda en un inventario de alacena: "g" (se pesa en gramos), "ml" (se mide en mililitros) o "u." (se cuenta por unidad individual, ej. 1 alfajor, 1 yogur).

Leé la tabla nutricional de la foto (suele decir "Información nutricional", con columnas "por 100 g"/"por 100 ml" y/o "por porción") y devolveme los valores YA CONVERTIDOS a la base que corresponde según la unidad:
- Si la unidad es "g" o "ml": los valores por cada 100 g o 100 ml.
- Si la unidad es "u.": los valores por UNA sola unidad/porción individual del producto (fijate el tamaño de porción de la etiqueta — si la etiqueta ya da valores "por porción" y esa porción es 1 unidad del producto, usá esos directo; si no, convertí desde la base de 100g/100ml al peso real de 1 unidad).

Respondé SOLO con JSON válido, sin markdown, sin texto extra, con este formato exacto:
{"kcal": <entero>, "protein": <entero, gramos>, "carbs": <entero, gramos>, "fat": <entero, gramos>, "fiber": <entero, gramos>}

Si la foto no muestra una tabla de información nutricional legible, respondé exactamente: {"error": "No encontré una tabla de información nutricional legible en la foto"}`;

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

    const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (!match) throw new Error("La imagen no tiene un formato válido");

    const parsed = (await callGeminiJson(
      SYSTEM_PROMPT,
      [
        { text: `Producto: ${name || "(sin nombre)"}. Unidad del inventario: ${unit || "g"}.` },
        { inline_data: { mime_type: match[1], data: match[2] } },
      ],
      0.1
    )) as { error?: string; kcal?: number; protein?: number; carbs?: number; fat?: number; fiber?: number };

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Error leyendo etiqueta nutricional:", error);
    if (error instanceof GeminiRateLimitError) {
      return NextResponse.json(
        { error: "La IA está saturada — parece que hay mucha gente usándola a la vez. Esperá un minuto y probá de nuevo." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "No pude leer la etiqueta. Probá con otra foto o cargalo a mano." }, { status: 500 });
  }
}
