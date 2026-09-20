import { MuscleGroup } from "@/lib/types";

export interface LibraryExercise {
  id: string;
  name: string;
  nameEs?: string;
  category: string;
  equipment: string | null;
  level: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  instructionsEs?: string[];
  images: string[];
}

/** Del vocabulario fino de músculos del dataset (17 valores, ver
 * MUSCLE_LABELS) a los 6 grupos gruesos que se usan para medir volumen
 * semanal (MuscleGroup, en lib/types.ts). */
const MUSCLE_TO_GROUP: Record<string, MuscleGroup> = {
  chest: "pecho",
  lats: "espalda",
  "middle back": "espalda",
  "lower back": "espalda",
  traps: "espalda",
  shoulders: "hombros",
  neck: "hombros",
  biceps: "brazos",
  triceps: "brazos",
  forearms: "brazos",
  quadriceps: "piernas",
  hamstrings: "piernas",
  calves: "piernas",
  glutes: "piernas",
  abductors: "piernas",
  adductors: "piernas",
  abdominals: "core",
};

/** Grupo muscular grueso a partir del primer músculo primario que matchee
 * -- undefined si el ejercicio no tiene músculos primarios reconocidos
 * (dataset incompleto para ese ejercicio puntual). */
export function muscleGroupFor(primaryMuscles: string[] | undefined): MuscleGroup | undefined {
  if (!primaryMuscles) return undefined;
  for (const muscle of primaryMuscles) {
    const group = MUSCLE_TO_GROUP[muscle];
    if (group) return group;
  }
  return undefined;
}

// Dataset gratuito y sin límites de requests (free-exercise-db, licencia
// abierta) -- se guarda una copia local en public/data/exercises.json (no
// depende de que el repo de GitHub siga arriba) y las imágenes de
// demostración se sirven directo desde el raw de GitHub, sin bajarlas.
const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
export function exerciseImageUrl(relativePath: string) {
  return `${IMAGE_BASE}${relativePath}`;
}

// El dataset original está en inglés. nameEs/instructionsEs (generados con
// IA, ver scripts/translate-exercises) traen la traducción al español; si
// faltan para algún ejercicio puntual, la UI cae al texto en inglés.
export const CATEGORY_LABELS: Record<string, string> = {
  strength: "Fuerza",
  cardio: "Cardio",
  stretching: "Estiramiento",
  plyometrics: "Pliometría",
  "olympic weightlifting": "Halterofilia",
  powerlifting: "Powerlifting",
  strongman: "Strongman",
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  "body only": "Peso corporal",
  barbell: "Barra",
  dumbbell: "Mancuernas",
  cable: "Polea",
  machine: "Máquina",
  kettlebells: "Kettlebell",
  bands: "Bandas",
  "e-z curl bar": "Barra Z",
  "exercise ball": "Pelota suiza",
  "foam roll": "Rodillo",
  "medicine ball": "Pelota medicinal",
  other: "Otro",
};

export const MUSCLE_LABELS: Record<string, string> = {
  abdominals: "Abdominales",
  abductors: "Abductores",
  adductors: "Aductores",
  biceps: "Bíceps",
  calves: "Gemelos",
  chest: "Pecho",
  forearms: "Antebrazos",
  glutes: "Glúteos",
  hamstrings: "Isquiotibiales",
  lats: "Dorsales",
  "lower back": "Zona lumbar",
  "middle back": "Espalda media",
  neck: "Cuello",
  quadriceps: "Cuádriceps",
  shoulders: "Hombros",
  traps: "Trapecios",
  triceps: "Tríceps",
};

let cache: LibraryExercise[] | null = null;
let inflight: Promise<LibraryExercise[]> | null = null;

/** Se pide una sola vez (cache en memoria del módulo) -- el picker se abre
 * y cierra bastante seguido mientras armás una rutina, no tiene sentido
 * volver a bajar el JSON de ~1MB cada vez. */
export function loadExerciseLibrary(): Promise<LibraryExercise[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/data/exercises.json")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar la lista de ejercicios");
        return res.json();
      })
      .then((data: LibraryExercise[]) => {
        cache = data;
        return data;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}
