import { NextRequest, NextResponse } from "next/server";
import { callGeminiJson, GeminiRateLimitError } from "@/lib/geminiClient";
import { DayMealOptions, MealKey, MealOption, Weekday } from "@/lib/types";

export const maxDuration = 60;

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, mismo tope que useTrainerApplication.ts

const WEEKDAYS: Weekday[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen", "col"];

const SYSTEM_PROMPT = `Sos un asistente que lee un plan nutricional semanal armado por un Nutricionista para un paciente (viene de un PDF, Word o Excel que el propio Nutricionista ya usaba) y lo convierte a esta estructura JSON exacta.

Días válidos (claves, en minúscula, sin tildes): lunes, martes, miercoles, jueves, viernes, sabado, domingo.
Comidas válidas (claves): des (desayuno), alm (almuerzo), mer (merienda), cen (cena), col (colación).

Para cada comida de cada día que el documento mencione, devolvé un array de "opciones" -- si el documento da una sola alternativa para esa comida, devolvé un array de UN solo elemento (no inventes opciones de más). Cada opción:
{"nombre": "<qué es, ej: Milanesa con puré>", "kcal": <entero>, "protein": <entero, gramos>, "carbs": <entero, gramos>, "fat": <entero, gramos>, "explicacion": "<por qué o cuándo elegir esta opción si el documento lo aclara, sino texto vacío>"}

Si el documento no da macros exactos para una comida, estimalos igual (no dejes 0 salvo que sea realmente 0). Si un día o una comida no aparece en el documento, NO incluyas esa clave (ni un array vacío).

Respondé SOLO con JSON válido, sin markdown, con esta forma exacta:
{"lunes": {"des": [...], "alm": [...]}, "martes": {...}, ...}

Si el documento no parece ser un plan de comidas (por ejemplo es otra cosa completamente distinta), respondé exactamente: {"error": "No pude reconocer un plan de comidas en este archivo"}`;

type ParsedPlan = { error?: string } & Partial<Record<Weekday, Partial<Record<MealKey, MealOption[]>>>>;

function isValidWeekday(k: string): k is Weekday {
  return (WEEKDAYS as string[]).includes(k);
}
function isValidMealKey(k: string): k is MealKey {
  return (MEAL_KEYS as string[]).includes(k);
}

/** Filtra cualquier clave que la IA se haya inventado (día/comida que no
 * existe) en vez de confiar ciegamente en lo que devolvió. */
function sanitize(parsed: ParsedPlan): Partial<Record<Weekday, DayMealOptions>> {
  const out: Partial<Record<Weekday, DayMealOptions>> = {};
  for (const [dayKey, dayVal] of Object.entries(parsed)) {
    if (!isValidWeekday(dayKey) || !dayVal || typeof dayVal !== "object") continue;
    const day: DayMealOptions = {};
    for (const [mealKey, options] of Object.entries(dayVal as Record<string, unknown>)) {
      if (!isValidMealKey(mealKey) || !Array.isArray(options) || options.length === 0) continue;
      day[mealKey] = options.map((o: Partial<MealOption>) => ({
        nombre: o.nombre || "Opción",
        kcal: Number(o.kcal) || 0,
        protein: Number(o.protein) || 0,
        carbs: Number(o.carbs) || 0,
        fat: Number(o.fat) || 0,
        explicacion: o.explicacion || "",
      }));
    }
    if (Object.keys(day).length > 0) out[dayKey] = day;
  }
  return out;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractXlsxText(buffer: Buffer): Promise<string> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  // El tipado de exceljs quedó desalineado con la versión de @types/node
  // instalada (Buffer<ArrayBufferLike> vs Buffer) -- es un desajuste de
  // tipos, no de runtime (buffer.load acepta cualquier Buffer real).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  const parts: string[] = [];
  workbook.eachSheet((sheet) => {
    parts.push(`--- Hoja: ${sheet.name} ---`);
    sheet.eachRow((row) => {
      const cells = (row.values as unknown[]).slice(1).map((v) => (v == null ? "" : String(v)));
      parts.push(cells.join(" | "));
    });
  });
  return parts.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileDataUrl, mimeType: rawMimeType, fileName } = body as { fileDataUrl?: string; mimeType?: string; fileName?: string };
    if (!fileDataUrl) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });

    const match = fileDataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) return NextResponse.json({ error: "El archivo no tiene un formato válido" }, { status: 400 });
    const base64 = match[2];

    // El navegador no siempre manda el mimeType exacto que esperamos para
    // Word/Excel (a veces llega vacío o genérico, según el sistema operativo
    // y sus asociaciones de archivo) -- si no matchea ninguno de los 3
    // conocidos, se usa la extensión del nombre del archivo como respaldo
    // antes de rechazarlo. El data: URL (match[1]) es la tercera fuente,
    // por si acaso.
    const KNOWN = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    let mimeType = rawMimeType && KNOWN.includes(rawMimeType) ? rawMimeType : undefined;
    if (!mimeType && KNOWN.includes(match[1])) mimeType = match[1];
    if (!mimeType && fileName) {
      const ext = fileName.toLowerCase().split(".").pop();
      if (ext === "pdf") mimeType = "application/pdf";
      else if (ext === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (ext === "xlsx") mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    if (!mimeType) mimeType = rawMimeType || "";
    if (Buffer.byteLength(base64, "base64") > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "El archivo pesa demasiado (máx. 10MB)." }, { status: 400 });
    }

    let userParts: { text?: string; inline_data?: { mime_type: string; data: string } }[];
    if (mimeType === "application/pdf") {
      userParts = [{ text: "Leé este PDF con el plan nutricional." }, { inline_data: { mime_type: mimeType, data: base64 } }];
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const text = await extractDocxText(Buffer.from(base64, "base64"));
      userParts = [{ text: `Texto extraído del Word:\n\n${text}` }];
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      const text = await extractXlsxText(Buffer.from(base64, "base64"));
      userParts = [{ text: `Contenido extraído del Excel:\n\n${text}` }];
    } else {
      return NextResponse.json({ error: "Formato no soportado -- subí un PDF, Word (.docx) o Excel (.xlsx)." }, { status: 400 });
    }

    let parsed: ParsedPlan | null = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        parsed = (await callGeminiJson(SYSTEM_PROMPT, userParts, 0.1)) as ParsedPlan;
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
        console.error("Gemini falló leyendo el plan nutricional, cayendo a Anthropic:", geminiError);
      }
    }

    if (!parsed) {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: "Configurá GEMINI_API_KEY o ANTHROPIC_API_KEY en .env.local" }, { status: 503 });
      }
      // Respaldo de texto únicamente -- el SDK de Anthropic instalado
      // (0.27.0) todavía no tiene tipado el content block "document" para
      // PDF nativo. Si Gemini (que sí lo soporta) falla justo con un PDF, se
      // avisa a reintentar en vez de forzar un tipo no soportado.
      if (mimeType === "application/pdf") {
        throw new Error("No se pudo leer el PDF -- probá de nuevo en un rato.");
      }
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userParts[0].text || "" }],
      });
      const textBlock = msg.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") throw new Error("Respuesta vacía del modelo");
      const clean = textBlock.text.replace(/```json|```/g, "").trim();
      const start = clean.indexOf("{");
      const end = clean.lastIndexOf("}");
      if (start < 0 || end < start) throw new Error("La IA no devolvió un JSON válido");
      parsed = JSON.parse(clean.slice(start, end + 1));
    }

    if (parsed?.error) return NextResponse.json({ error: parsed.error }, { status: 422 });
    return NextResponse.json(sanitize(parsed || {}));
  } catch (error) {
    console.error("Error leyendo plan nutricional:", error);
    if (error instanceof GeminiRateLimitError) {
      return NextResponse.json(
        { error: "La IA está saturada — parece que hay mucha gente usándola a la vez. Esperá un minuto y probá de nuevo." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "No pude leer el archivo. Probá con otro, o cargalo a mano." }, { status: 500 });
  }
}
