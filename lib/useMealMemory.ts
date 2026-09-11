"use client";

import { useCallback, useEffect, useState } from "react";
import { MealKey } from "@/lib/types";

const KEY = "registro:mealMemory:v1";
const LEGACY_KEY = "registro:mealHistory:v1"; // versión vieja: solo texto + count, sin kcal/proteína
const MAX_STORED = 300;
const MATCH_THRESHOLD = 0.6;

const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas",
  "y", "con", "sin", "a", "al", "en", "por", "para", "que", "se", "lo",
]);

const MEAL_NAME_TO_KEY: Record<string, MealKey> = {
  desayuno: "des",
  almuerzo: "alm",
  merienda: "mer",
  cena: "cen",
};

export interface MealMemoryEntry {
  text: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  count: number;
  updatedAt: number;
  meal?: MealKey; // última comida (desayuno/almuerzo/...) en la que se registró — para no sugerir cosas de otro momento del día
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulWords(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter((w) => w.length > 2 && !STOPWORDS.has(w)));
}

/**
 * Similitud "flexible": cuánto de la descripción más corta aparece en la
 * otra. Si alguna de las dos tiene menos de 2 palabras significativas
 * (ej. "Banana"), exige coincidencia exacta para evitar falsos positivos
 * de una sola palabra pegándose a cualquier comida que la mencione.
 */
function similarity(a: string, b: string): number {
  const wa = meaningfulWords(a);
  const wb = meaningfulWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  if (wa.size < 2 || wb.size < 2) return normalize(a) === normalize(b) ? 1 : 0;
  let shared = 0;
  wa.forEach((w) => {
    if (wb.has(w)) shared += 1;
  });
  return shared / Math.min(wa.size, wb.size);
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Memoria de comidas: recuerda kcal/proteína exactos por descripción, para
 * no depender de que la IA vuelva a estimar cada vez que repetís algo. El
 * match es flexible (por palabras compartidas), así "yogur con mermelada
 * de arándanos" reconoce a "yogur proteico con mermelada de arándanos,
 * lo hice con leche..." sin que tengas que escribir exactamente lo mismo.
 * Es por dispositivo (localStorage) — un hábito personal, no un dato de
 * la cuenta.
 */
export function useMealMemory() {
  const [memory, setMemory] = useState<MealMemoryEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        setMemory(JSON.parse(raw));
        return;
      }
      const legacyRaw = localStorage.getItem(LEGACY_KEY);
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw) as Array<{ text: string; count: number }>;
        const migrated: MealMemoryEntry[] = legacy.map((h) => ({
          text: h.text,
          kcal: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          count: h.count,
          updatedAt: Date.now(),
        }));
        setMemory(migrated);
        localStorage.setItem(KEY, JSON.stringify(migrated));
      }
    } catch (e) {
      console.error("Error cargando memoria de comidas", e);
    }
  }, []);

  const persist = useCallback((next: MealMemoryEntry[]) => {
    next.sort((a, b) => b.count - a.count || b.updatedAt - a.updatedAt);
    const trimmed = next.slice(0, MAX_STORED);
    setMemory(trimmed);
    try {
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error("Error guardando memoria de comidas", e);
    }
    return trimmed;
  }, []);

  const remember = useCallback(
    (text: string, kcal: number, protein: number, carbs = 0, fat = 0, meal?: MealKey, fiber = 0) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;
      setMemory((prev) => {
        const key = normalize(trimmedText);
        const existingIndex = prev.findIndex((e) => normalize(e.text) === key);
        const next =
          existingIndex >= 0
            ? prev.map((e, i) =>
                i === existingIndex
                  ? { text: trimmedText, kcal, protein, carbs, fat, fiber, meal: meal ?? e.meal, count: e.count + 1, updatedAt: Date.now() }
                  : e
              )
            : [...prev, { text: trimmedText, kcal, protein, carbs, fat, fiber, meal, count: 1, updatedAt: Date.now() }];
        return persist(next);
      });
    },
    [persist]
  );

  const findMatch = useCallback(
    (text: string): MealMemoryEntry | null => {
      if (!text.trim()) return null;
      let best: MealMemoryEntry | null = null;
      let bestScore = 0;
      for (const entry of memory) {
        if (entry.kcal <= 0) continue; // entradas migradas sin valor real, no sirven para saltear la IA
        const score = similarity(text, entry.text);
        if (score > bestScore) {
          bestScore = score;
          best = entry;
        }
      }
      return bestScore >= MATCH_THRESHOLD ? best : null;
    },
    [memory]
  );

  const importCsv = useCallback(
    (content: string): { imported: number; skipped: number } => {
      const rows = parseCsv(content).filter((r) => r.some((cell) => cell.trim() !== ""));
      if (rows.length === 0) return { imported: 0, skipped: 0 };
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const descIdx = header.indexOf("descripcion");
      const kcalIdx = header.indexOf("kcal");
      const protIdx = header.findIndex((h) => h.startsWith("proteina"));
      const carbIdx = header.findIndex((h) => h.startsWith("carb"));
      const fatIdx = header.findIndex((h) => h.startsWith("grasa") || h.startsWith("fat"));
      const fiberIdx = header.findIndex((h) => h.startsWith("fibra") || h.startsWith("fiber"));
      const mealIdx = header.indexOf("comida");
      if (descIdx < 0 || kcalIdx < 0 || protIdx < 0) {
        throw new Error('El CSV necesita columnas: "descripcion", "kcal", "proteina_g"');
      }
      let imported = 0;
      let skipped = 0;
      for (const row of rows.slice(1)) {
        const descripcion = (row[descIdx] || "").trim();
        const kcal = Number(row[kcalIdx]);
        const protein = Number(row[protIdx]) || 0;
        const carbs = carbIdx >= 0 ? Number(row[carbIdx]) || 0 : 0;
        const fat = fatIdx >= 0 ? Number(row[fatIdx]) || 0 : 0;
        const fiber = fiberIdx >= 0 ? Number(row[fiberIdx]) || 0 : 0;
        const meal = mealIdx >= 0 ? MEAL_NAME_TO_KEY[(row[mealIdx] || "").trim().toLowerCase()] : undefined;
        if (!descripcion || /sin registro/i.test(descripcion) || !kcal) {
          skipped++;
          continue;
        }
        remember(descripcion, kcal, protein, carbs, fat, meal, fiber);
        imported++;
      }
      return { imported, skipped };
    },
    [remember]
  );

  return { memory, remember, findMatch, importCsv };
}
