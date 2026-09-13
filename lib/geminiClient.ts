// Cliente compartido para las 4 rutas que llaman a Gemini (parse-meal,
// parse-shopping, review-inventory, parse-nutrition-label). Centraliza:
// - Soporte para VARIAS API keys gratuitas (GEMINI_API_KEY="key1,key2,key3")
//   rotando a la siguiente si una está rate-limited (429) o sin cuota.
// - Un reintento corto por key antes de pasar a la próxima (los 429 suelen
//   ser momentáneos si hay varias personas usando la app a la vez).
// - Un error distinguible (GeminiRateLimitError) para que cada ruta pueda
//   devolver un mensaje claro de "está saturada, probá en un rato" en vez
//   de un error genérico -- o de quedarse esperando para siempre.

export class GeminiRateLimitError extends Error {
  constructor(message = "Gemini está saturado (demasiadas solicitudes)") {
    super(message);
    this.name = "GeminiRateLimitError";
  }
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

type GeminiPart = { text?: string; inline_data?: { mime_type: string; data: string } };

function getApiKeys(): string[] {
  return (process.env.GEMINI_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonText(text: string): string {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("La IA no devolvió un JSON válido");
  return clean.slice(start, end + 1);
}

/**
 * Llama a Gemini con las partes del turno del usuario, probando cada API
 * key configurada (separadas por coma en GEMINI_API_KEY) hasta que una
 * responda bien. Devuelve el JSON ya parseado de la respuesta.
 */
export async function callGeminiJson(systemPrompt: string, userParts: GeminiPart[], temperature = 0.2): Promise<unknown> {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error("Falta GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  let lastError: unknown = null;
  let sawRateLimit = false;

  for (const key of keys) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: userParts }],
            generationConfig: { temperature, responseMimeType: "application/json" },
          }),
        });

        if (response.status === 429) {
          sawRateLimit = true;
          lastError = new GeminiRateLimitError();
          if (attempt === 0) {
            await sleep(1000);
            continue;
          }
          break; // pasar a la próxima key
        }

        const data = (await response.json()) as GeminiResponse & { error?: { message?: string } };
        if (!response.ok) {
          lastError = new Error(data.error?.message || "Gemini rechazó la solicitud");
          break;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = new Error("Gemini no devolvió una respuesta");
          break;
        }

        return JSON.parse(extractJsonText(text));
      } catch (error) {
        lastError = error;
        break;
      }
    }
  }

  if (sawRateLimit) throw new GeminiRateLimitError();
  throw lastError instanceof Error ? lastError : new Error("No pude contactar a Gemini");
}
