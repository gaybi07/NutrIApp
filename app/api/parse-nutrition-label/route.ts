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

type LabelResult = { error?: string; kcal?: number; protein?: number; carbs?: number; fat?: number; fiber?: number };

/** Misma etiqueta, contra Claude en vez de Gemini -- respaldo cuando Gemini
 * está saturado (mismo patrón que parse-shopping, que también manda foto). */
async function parseLabelWithAnthropic(mimeType: string, base64: string, name: string | undefined, unit: string | undefined, apiKey: string): Promise<LabelResult> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 } },
          { type: "text", text: `Producto: ${name || "(sin nombre)"}. Unidad del inventario: ${unit || "g"}.` },
        ],
      },
    ],
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
    const { imageDataUrl, name, unit } = body as { imageDataUrl?: string; name?: string; unit?: string };

    if (!imageDataUrl) {
      return NextResponse.json({ error: "Falta la foto de la etiqueta" }, { status: 400 });
    }

    const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (!match) throw new Error("La imagen no tiene un formato válido");

    let parsed: LabelResult | null = null;

    // Gemini primero (gratis); si está saturado o falla y hay una key de
    // Anthropic configurada, cae ahí en vez de fallar directo -- dos
    // proveedores distintos como respaldo mutuo (mismo patrón que parse-meal).
    if (process.env.GEMINI_API_KEY) {
      try {
        parsed = (await callGeminiJson(
          SYSTEM_PROMPT,
          [
            { text: `Producto: ${name || "(sin nombre)"}. Unidad del inventario: ${unit || "g"}.` },
            { inline_data: { mime_type: match[1], data: match[2] } },
          ],
          0.1
        )) as LabelResult;
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
        console.error("Gemini falló leyendo la etiqueta, cayendo a Anthropic:", geminiError);
      }
    }

    if (!parsed) {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: "Configurá GEMINI_API_KEY o ANTHROPIC_API_KEY en .env.local" }, { status: 503 });
      }
      parsed = await parseLabelWithAnthropic(match[1], match[2], name, unit, process.env.ANTHROPIC_API_KEY);
    }

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
