export interface LibraryExercise {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  level: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
}

// Dataset gratuito y sin límites de requests (free-exercise-db, licencia
// abierta) -- se guarda una copia local en public/data/exercises.json (no
// depende de que el repo de GitHub siga arriba) y las imágenes de
// demostración se sirven directo desde el raw de GitHub, sin bajarlas.
const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
export function exerciseImageUrl(relativePath: string) {
  return `${IMAGE_BASE}${relativePath}`;
}

// El dataset está en inglés (nombres e instrucciones) -- traducir 876
// instrucciones no es viable a mano, pero los nombres y filtros sí, para
// que al menos el "chrome" de la búsqueda esté en español. Instrucciones
// quedan en inglés (con la foto al lado, que no necesita traducción).
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
