import { NextRequest, NextResponse } from "next/server";
import { callGeminiJson, GeminiRateLimitError } from "@/lib/geminiClient";

const SYSTEM_PROMPT = `Sos un nutricionista argentino calculando kcal, proteína, carbohidratos, grasas y fibra de una comida a partir de una descripción en lenguaje natural, a veces dictada por voz (puede tener errores de dictado, corregilos si son obvios, y puede ser larga o tener detalles de más).
Reglas:
- Usá SIEMPRE la estimación más realista (punto medio del rango típico), nunca el extremo más alto ni el más bajo.
- Si hay varios alimentos, sumalos todos.
- Si una cantidad no está clara, asumí una porción individual normal.
- "carbs" y "fat" son gramos de carbohidratos y grasas totales de la comida — deben ser consistentes con "kcal" (kcal ≈ protein×4 + carbs×4 + fat×9, con margen razonable).
- "fiber" son gramos de fibra (parte de los carbohidratos, no se suma aparte) — 0 si la comida no tiene nada de fibra (ej. pura carne o lácteos).
- "resumen": un título corto (3 a 6 palabras) en español que capture lo esencial de la comida, ignorando aclaraciones menores. Ej: si el texto es un párrafo largo explicando "yogur con mermelada de arándanos, lo hice con leche proteica, con...", el resumen es simplemente "Yogur con mermelada de arándanos".
- "ingredientes": un listado separado por comas de los alimentos con cantidad y unidad, normalizado para descontar de una alacena, formato "<cantidad> <unidad: g/ml/u> <nombre simple del alimento>". Ej: "2 u huevo, 1 u tostada, 30 g queso crema, 1 u banana". Usá nombres simples y genéricos (sin marcas ni adjetivos raros).
- "items": un desglose de la comida en sus alimentos o platos principales (no cada condimento suelto), cada uno con su propio kcal/protein/carbs/fat/fiber/gramos — la suma de todos los items tiene que dar EXACTAMENTE los totales de arriba. Nombres cortos en español, con mayúscula inicial (sin la cantidad en el nombre, esa va aparte en "gramos"). "gramos" es el peso aproximado de esa porción (para alimentos que se miden en unidades como un huevo o una banana, convertilo a su peso aproximado en gramos igual). Ej. para "milanesa con puré y ensalada": [{"nombre":"Milanesa","kcal":400,"protein":35,"carbs":20,"fat":18,"fiber":1,"gramos":150},{"nombre":"Puré de papas","kcal":180,"protein":3,"carbs":35,"fat":4,"fiber":3,"gramos":200},{"nombre":"Ensalada","kcal":60,"protein":2,"carbs":8,"fat":3,"fiber":3,"gramos":100}]. Si es un solo alimento simple, "items" puede tener un solo elemento igual a los totales, con su cantidad igual.
- Respondé SOLO con un JSON válido, sin texto adicional, sin backticks, con este formato exacto:
{"kcal": <numero entero>, "protein": <numero entero, gramos>, "carbs": <numero entero, gramos>, "fat": <numero entero, gramos>, "fiber": <numero entero, gramos>, "detalle": "<breve desglose de 1 linea, en español>", "resumen": "<titulo corto>", "ingredientes": "<listado para inventario>", "items": [{"nombre": "<string>", "kcal": <int>, "protein": <int>, "carbs": <int>, "fat": <int>, "fiber": <int>, "gramos": <int>}]}`;

function extractJson(text: string) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("La IA no devolvió un JSON válido");
  return JSON.parse(clean.slice(start, end + 1));
}

async function parseWithAnthropic(text: string, apiKey: string) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Comida: ${text}` }],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Respuesta vacía del modelo");
  return extractJson(textBlock.text);
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Falta el texto de la comida" }, { status: 400 });
    }

    // Gemini primero (gratis); si está saturado o falla y hay una key de
    // Anthropic configurada, cae ahí en vez de fallar directo -- dos
    // proveedores distintos como respaldo mutuo.
    if (process.env.GEMINI_API_KEY) {
      try {
        return NextResponse.json(await callGeminiJson(SYSTEM_PROMPT, [{ text: `Comida: ${text}` }]));
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
        console.error("Gemini falló, cayendo a Anthropic:", geminiError);
      }
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Configurá GEMINI_API_KEY o ANTHROPIC_API_KEY en .env.local" },
        { status: 503 }
      );
    }

    return NextResponse.json(await parseWithAnthropic(text, process.env.ANTHROPIC_API_KEY));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo calcular la comida" }, { status: 500 });
  }
}
