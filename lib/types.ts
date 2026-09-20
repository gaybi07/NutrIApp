export type MealKey = "des" | "alm" | "mer" | "cen" | "col";
export type TrainingIntensity = "leve" | "moderado" | "exigente" | "fallo";
export type GoalMode = "perder" | "recomponer" | "aumentar";

export type InventoryCategory =
  | "proteina_animal"
  | "proteina_vegetal"
  | "lacteos"
  | "verduras"
  | "frutas"
  | "harinas"
  | "bebidas"
  | "condimentos"
  | "otros";
export const INVENTORY_CATEGORIES: { id: InventoryCategory; label: string }[] = [
  { id: "proteina_animal", label: "Proteína animal" },
  { id: "proteina_vegetal", label: "Proteína vegetal" },
  { id: "lacteos", label: "Lácteos" },
  { id: "verduras", label: "Verduras" },
  { id: "frutas", label: "Frutas" },
  { id: "harinas", label: "Harinas y cereales" },
  { id: "bebidas", label: "Bebidas" },
  { id: "condimentos", label: "Condimentos" },
  { id: "otros", label: "Otros" },
];
export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = Object.fromEntries(
  INVENTORY_CATEGORIES.map((c) => [c.id, c.label])
) as Record<InventoryCategory, string>;

export interface InventoryNutrition {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** Dónde vive un producto en la "Cocina Virtual" (vista alternativa de la
 * Alacena) — puramente organizativo, no cambia nada de la nutrición ni del
 * stock. "mesada" es el catch-all para lo que todavía no se ubicó. */
export type InventoryZone = "flotante" | "mesada" | "bajomesada" | "heladera";
export const INVENTORY_ZONES: { id: InventoryZone; label: string }[] = [
  { id: "flotante", label: "Alacena flotante" },
  { id: "mesada", label: "Sobre la mesada" },
  { id: "bajomesada", label: "Bajo mesada" },
  { id: "heladera", label: "Heladera" },
];
export const INVENTORY_ZONE_LABELS: Record<InventoryZone, string> = Object.fromEntries(
  INVENTORY_ZONES.map((z) => [z.id, z.label])
) as Record<InventoryZone, string>;

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: "g" | "ml" | "u.";
  category?: InventoryCategory;
  nutritionPer100g?: InventoryNutrition;
  // El usuario ya revisó/corrigió el valor nutricional a mano — no pisarlo
  // con una nueva estimación de la IA (ej. al usar "Revisar con IA").
  nutritionConfirmed?: boolean;
  zona?: InventoryZone;
}

export interface CalculatorProfile {
  actual: string;
  meta: string;
  altura: string;
  edad: string;
  sexo: "hombre" | "mujer";
  fecha: string;
  modo: GoalMode;
}

/** "fuerza" es el default implícito de las sesiones viejas (sin este campo,
 * de antes de que existiera la distinción) -- ver getTrainingSessions(). */
export type TrainingType = "fuerza" | "aerobico";

export interface TrainingSession {
  intensidad: TrainingIntensity;
  minutos: number;
  tipo?: TrainingType;
  /** Solo tiene sentido con tipo "aerobico" (yoga, fútbol, básquet, etc.) —
   * lista libre con sugerencias, no un enum cerrado, porque puede haber
   * cualquier deporte/práctica. No cambia el cálculo de kcal (eso sigue
   * siendo por intensidad+minutos+peso, igual para cualquier disciplina). */
  disciplina?: string;
}

/** Sugerencias para el selector de disciplina aeróbica — no es una lista
 * cerrada, el usuario puede escribir cualquier otra. */
export const AEROBIC_DISCIPLINE_SUGGESTIONS = [
  "Running", "Caminata", "Bici", "Natación", "Yoga", "Pilates",
  "Fútbol", "Básquet", "Handball", "Tenis", "Pádel", "Vóley",
];

/** Lun-Dom, en ese orden — usado por la rutina semanal (`TrainingSchedule`). */
export type Weekday = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

/** El índice coincide con `Date.getDay()` (0 = domingo). */
export const WEEKDAYS: Weekday[] = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

/** Una serie individual, cargada en vivo durante un entrenamiento (peso/reps/cómo se sintió, por serie). */
export interface ExerciseSetEntry {
  repeticiones: number;
  peso?: number; // kg, opcional (ej. ejercicios con peso corporal)
  intensidad: TrainingIntensity;
}

/** Agrupación gruesa (6 grupos) para medir volumen entrenado por zona del
 * cuerpo -- más fina que esto (la biblioteca de ejercicios distingue ~17
 * músculos) sería demasiado ruido para un resumen semanal. Se completa sola
 * al elegir un ejercicio "desde biblioteca" (ver muscleGroupFor en
 * lib/exerciseLibrary.ts) pero también se puede elegir a mano. */
export type MuscleGroup = "pecho" | "espalda" | "hombros" | "brazos" | "piernas" | "core";
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  pecho: "Pecho",
  espalda: "Espalda",
  hombros: "Hombros",
  brazos: "Brazos",
  piernas: "Piernas",
  core: "Core",
};

/** Un ejercicio registrado. `sets` (opcional) es el detalle real serie por serie, cargado
 * desde el entrenamiento en vivo -- si está, series/repeticiones/peso de acá abajo son un
 * resumen derivado de `sets` (para que lo viejo que solo lee esos 3 campos siga andando). */
export interface ExerciseEntry {
  nombre: string;
  series: number;
  repeticiones: number;
  peso?: number; // kg, opcional (ej. ejercicios con peso corporal)
  sets?: ExerciseSetEntry[];
  grupoMuscular?: MuscleGroup;
}

/** Rutina reusable (ej. "Día A: Pecho/Tríceps") — plantilla de ejercicios, no un registro de un día puntual. */
export interface Routine {
  id: string;
  nombre: string;
  ejercicios: ExerciseEntry[];
}

/** Qué rutina corresponde a cada día de la semana — se repite todas las semanas hasta que se cambie. */
export type TrainingSchedule = Partial<Record<Weekday, string>>; // weekday -> Routine.id

/** Estado de la postulación para ser entrenador certificado dentro de la app --
 * "ninguno" es el implícito (todavía no se postuló, no hay fila en la tabla). */
export type TrainerStatus = "pendiente" | "aprobado" | "rechazado";

export interface TrainerApplication {
  id: string;
  userId: string;
  userEmail: string;
  certificatePath: string;
  status: TrainerStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

/** Vínculo entre un alumno y su entrenador (a lo sumo uno por alumno, igual
 * que el "hogar" de la alacena) -- lo que ve el lado ALUMNO. */
export interface TrainerLink {
  trainerId: string;
  trainerEmail: string;
  createdAt: string;
}

/** Lo que ve el lado ENTRENADOR de un vínculo: uno de sus alumnos. */
export interface TrainerStudent {
  studentId: string;
  studentEmail: string;
  createdAt: string;
}

/** Rutina armada por un entrenador para sus alumnos -- vive en su propia tabla
 * (no en Settings.routines) porque la tienen que poder leer los alumnos
 * vinculados, no solo el dueño. Adoptarla copia sus ejercicios a una Routine
 * normal en el Settings del alumno. */
export interface TrainerRoutine {
  id: string;
  trainerId: string;
  nombre: string;
  ejercicios: ExerciseEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Sugerencia para la próxima vez que se entrena este ejercicio dentro de esta rutina,
 * generada automáticamente al cerrar un entrenamiento en vivo (comparando lo hecho contra
 * lo planificado). Se guarda por `routineId + nombre` para poder mostrarla la semana que
 * viene, el mismo día, cuando se vuelva a entrenar ese ejercicio. */
export interface WorkoutSuggestion {
  nota: string; // ej. "Te resultó liviano — probá +2.5kg"
  pesoSugerido?: number;
  generatedAt: number; // epoch ms
}

/** "mejor/similar/peor" que lo planificado, según el volumen real de esa serie. */
export type WorkoutVerdict = "mejor" | "similar" | "peor";

export interface WorkoutReportItem {
  nombre: string;
  verdict: WorkoutVerdict;
  nota: string;
}

/** Reporte que queda al cerrar un entrenamiento en vivo -- se guarda en el
 * DayEntry del día para poder volver a verlo más tarde (no es efímero, no
 * desaparece apenas se cierra el modal la primera vez). */
export interface WorkoutReport {
  minutos: number;
  overallIntensidad: TrainingIntensity;
  items: WorkoutReportItem[];
}

/** Un alimento/plato individual dentro de una comida (ej. "Puré de papas" adentro de la Cena) — editable y borrable por separado. */
export interface MealItem {
  id: string;
  nombre: string;
  kcal: number;
  protein: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  gramos?: number; // peso aproximado de la porción — al cambiarlo, se reescalan kcal/proteína/etc. en proporción
}

export interface DayEntry {
  fecha: string; // YYYY-MM-DD
  desK: number;
  desP: number;
  desC?: number; // carbohidratos (g) — opcional para no romper registros viejos sin este dato
  desG?: number; // grasas (g)
  desF?: number; // fibra (g)
  almK: number;
  almP: number;
  almC?: number;
  almG?: number;
  almF?: number;
  merK: number;
  merP: number;
  merC?: number;
  merG?: number;
  merF?: number;
  cenK: number;
  cenP: number;
  cenC?: number;
  cenG?: number;
  cenF?: number;
  colK: number; // colación / aperitivo — lo que no entra en las 4 comidas principales
  colP: number;
  colC?: number;
  colG?: number;
  colF?: number;
  pasos: number;
  entreno: boolean;
  pesoKg?: number;
  suenoHoras?: number;
  entrenoMinutos?: number; // formato viejo: primer/único entrenamiento del día
  entrenoIntensidad?: TrainingIntensity; // formato viejo
  entrenamientos?: TrainingSession[]; // formato nuevo: soporta más de un entrenamiento por día
  ejercicios?: ExerciseEntry[]; // desglose real de lo entrenado ese día (series/reps/peso por ejercicio)
  entrenamientoReporte?: WorkoutReport; // reporte planificado vs. real del entrenamiento en vivo de ese día -- se puede volver a abrir más tarde
  alimentos?: string[]; // nombres de ingredientes comidos ese día (para diversidad de grupos alimenticios en Macros)
  desItems?: MealItem[]; // desglose editable del desayuno — la suma de estos da desK/desP/desC/desG/desF
  almItems?: MealItem[];
  merItems?: MealItem[];
  cenItems?: MealItem[];
  colItems?: MealItem[];
}

export type WeekPlan = Record<string, Partial<Record<MealKey, string>>>; // fecha -> comida -> título de receta

/** Las solapas de arriba que se pueden prender/apagar desde Preferencias — "inicio" no está acá porque siempre está fija. */
export type MainTab = "inicio" | "comidas" | "macros" | "actividad" | "gastos";

export const OPTIONAL_TABS: MainTab[] = ["macros", "comidas", "actividad", "gastos"];
export const DEFAULT_ENABLED_TABS: MainTab[] = ["inicio", "comidas", "macros", "actividad", "gastos"];

export type ThemeMode = "claro" | "oscuro" | "neon" | "olimpo";

export type FontSize = "chico" | "mediano" | "grande";

export const FONT_SIZE_OPTIONS: { value: FontSize; label: string; description: string; previewPx: number }[] = [
  { value: "chico", label: "Chico", description: "El tamaño de siempre, el más compacto.", previewPx: 14 },
  { value: "mediano", label: "Mediano", description: "Un poco más grande, más fácil de leer.", previewPx: 17 },
  { value: "grande", label: "Grande", description: "Letra bien grande, ideal si cuesta leer en el celular.", previewPx: 21 },
];

/** Los bloques grandes de cada solapa, en el orden que el usuario eligió
 * arrastrándolos (mantener apretado en cualquier parte del bloque, como
 * mover íconos en la pantalla de inicio del celular) — si no personalizó
 * nada todavía, se usa el orden por default de cada solapa. */
export type InicioBlockId = "hoy" | "comidas" | "peso" | "objetivo" | "seguimiento" | "comidasSemana";
export const DEFAULT_INICIO_ORDER: InicioBlockId[] = [
  "hoy",
  "comidas",
  "peso",
  "objetivo",
  "seguimiento",
  "comidasSemana",
];
export const INICIO_BLOCK_LABELS: Record<InicioBlockId, string> = {
  hoy: "Hoy",
  comidas: "Editar comidas de hoy",
  peso: "Peso de esta semana",
  objetivo: "Tu objetivo",
  // Antes eran tres bloques separados (Indicadores, Kcal por día y Tabla de
  // la semana) -- se unificaron en uno solo a pedido del usuario, con las
  // tres partes juntas adentro en vez de tener que abrir/cerrar tres
  // tarjetas distintas para ver lo mismo de la semana.
  seguimiento: "Seguimiento semanal",
  comidasSemana: "Comidas por día",
};

/** La solapa Comidas antes tenía dos sub-solapas (Alacena/Planificado) --
 * unificadas en una sola tira continua a pedido del usuario, para no tener
 * que ir y volver entre las dos. Todos los bloques conviven en un mismo
 * orden ahora. */
export type ComidasBlockId = "hogar" | "alacena" | "sugerencias" | "comunes" | "compras" | "planificador";
export const DEFAULT_COMIDAS_ORDER: ComidasBlockId[] = ["hogar", "alacena", "sugerencias", "comunes", "compras", "planificador"];
export const COMIDAS_BLOCK_LABELS: Record<ComidasBlockId, string> = {
  hogar: "Grupo compartido",
  alacena: "Alacena",
  sugerencias: "Sugerencias de recetas",
  comunes: "Comidas más comunes",
  compras: "Registro de compras",
  planificador: "Planificador semanal",
};

/** Un renglón de lo que se compró de verdad (marca, precio) -- separado del
 * inventario porque la Alacena guarda STOCK actual, no historial; esto es
 * un registro fechado que se arma solo al leer un ticket con IA (no al
 * agregar productos a mano, que no trae precio/marca). */
export interface PurchaseRecord {
  id: string;
  fecha: string; // YYYY-MM-DD
  name: string;
  quantity: number;
  unit: "g" | "ml" | "u.";
  brand?: string;
  price?: number;
  category?: InventoryCategory;
}

export type MacrosBlockId = "resumen" | "ranking" | "reparto" | "semana" | "proteina" | "cruceEntreno" | "fibra" | "diversidad" | "tabla";
export const DEFAULT_MACROS_ORDER: MacrosBlockId[] = [
  "resumen", "ranking", "reparto", "semana", "proteina", "cruceEntreno", "fibra", "diversidad", "tabla",
];
export const MACROS_BLOCK_LABELS: Record<MacrosBlockId, string> = {
  resumen: "Hoy · Macros",
  ranking: "Ranking de días",
  reparto: "Reparto de macros de hoy",
  semana: "Macros de la semana",
  proteina: "Proteína vs objetivo",
  cruceEntreno: "Comida vs. entrenamiento",
  fibra: "Fibra de la semana",
  diversidad: "Diversidad de esta semana",
  tabla: "Tabla nutricional de la semana",
};

export type ActividadBlockId =
  | "resumen" | "objetivoEntreno" | "indicadoresEntreno" | "pasosEditar" | "pasosChart" | "entrenoChart" | "suenoChart" | "volumenChart" | "volumenGrupos" | "rutinas";
export const DEFAULT_ACTIVIDAD_ORDER: ActividadBlockId[] = [
  "resumen", "objetivoEntreno", "indicadoresEntreno", "pasosEditar", "pasosChart", "entrenoChart", "suenoChart", "volumenChart", "volumenGrupos", "rutinas",
];
export const ACTIVIDAD_BLOCK_LABELS: Record<ActividadBlockId, string> = {
  resumen: "Hoy · Entrenamiento",
  objetivoEntreno: "Objetivo de entrenamiento",
  indicadoresEntreno: "Indicadores de entrenamiento",
  pasosEditar: "Pasos (editar)",
  pasosChart: "Gráfico de pasos",
  entrenoChart: "Gráfico de entrenamiento",
  suenoChart: "Gráfico de sueño",
  volumenChart: "Gráfico de volumen",
  volumenGrupos: "Volumen por grupo muscular",
  rutinas: "Rutinas",
};

/** Supabase guarda el orden custom como jsonb con default '[]', así que un
 * array vacío (todavía no personalizado) no debe pisar el orden por
 * default — un `order || fallback` común falla porque `[]` es truthy.
 * Además reconcilia contra el default actual: si algún bloque ya
 * guardado dejó de existir (ej. se dividió en varios, como pasó con
 * "semana"), se descarta, y si el default tiene bloques nuevos que el
 * usuario todavía no personalizó, se agregan al final — así nunca
 * desaparece un bloque nuevo solo porque el usuario ya había
 * arrastrado algo antes. */
export function resolveOrder<T>(order: T[] | undefined, fallback: T[]): T[] {
  if (!order || order.length === 0) return fallback;
  const known = order.filter((id) => fallback.includes(id));
  const missing = fallback.filter((id) => !known.includes(id));
  return [...known, ...missing];
}

export interface Settings {
  goal: number; // kcal objetivo diario de consumo
  tdeeFallback: number; // gasto de referencia cuando no hay pasos cargados
  weeklyWeights?: Record<string, number>; // peso registrado por semana, usando el lunes como clave
  calculatorProfile?: CalculatorProfile;
  tourDone?: boolean; // si ya vio el tour guiado de la app (se muestra una sola vez, tras el onboarding)
  weekPlan?: WeekPlan; // planificador de comidas por día, se sincroniza entre dispositivos
  routines?: Routine[]; // rutinas de entrenamiento reusables
  trainingSchedule?: TrainingSchedule; // qué rutina toca cada día de la semana
  theme?: ThemeMode; // claro / oscuro / neon / olimpo, elegido desde Preferencias
  enabledTabs?: MainTab[]; // qué solapas de arriba se muestran además de Inicio (que siempre está)
  fontSize?: FontSize; // chico / mediano / grande, elegido en el onboarding o desde Preferencias
  inicioOrder?: InicioBlockId[]; // orden de los bloques de Inicio, elegido arrastrándolos
  comidasOrder?: ComidasBlockId[]; // ídem, solapa Comidas
  macrosOrder?: MacrosBlockId[]; // ídem, solapa Macros
  actividadOrder?: ActividadBlockId[]; // ídem, solapa Entrenamientos
  inicioHidden?: InicioBlockId[]; // bloques de Inicio apagados con el foquito — se pueden reactivar en Preferencias > Secciones
  comidasHidden?: ComidasBlockId[]; // ídem, solapa Comidas
  macrosHidden?: MacrosBlockId[]; // ídem, solapa Macros
  actividadHidden?: ActividadBlockId[]; // ídem, solapa Entrenamientos
  aiReviewLockedUntil?: number; // timestamp (ms) hasta el que "Revisar con IA" de la Alacena queda bloqueado, para no recargar la API de IA
  workoutSuggestions?: Record<string, WorkoutSuggestion>; // clave `${routineId}::${nombre del ejercicio}`
}

export const MEAL_LABELS: Record<MealKey, string> = {
  des: "Desayuno",
  alm: "Almuerzo",
  mer: "Merienda",
  cen: "Cena",
  col: "Colación",
};

export const INTENSITY_STYLES: Record<
  TrainingIntensity | "ninguno",
  { label: string; background: string; color: string; description: string }
> = {
  ninguno: { label: "No entrené", background: "#F4F1E8", color: "#1C1B18", description: "Sin sesión de entrenamiento." },
  leve: { label: "Leve", background: "#4F8CC9", color: "#FFFFFF", description: "Actividad suave, con esfuerzo cómodo." },
  moderado: { label: "Moderado", background: "#B5533C", color: "#FFFFFF", description: "Esfuerzo sostenido, pero controlado." },
  exigente: { label: "Exigente", background: "#C9A227", color: "#1C1B18", description: "Sesión intensa, con bastante esfuerzo." },
  fallo: { label: "Al fallo", background: "rgb(var(--color-accent))", color: "rgb(var(--color-bg))", description: "Series muy exigentes, cerca o al fallo muscular." },
};

export const emptyDay = (fecha: string): DayEntry => ({
  fecha,
  desK: 0, desP: 0, desC: 0, desG: 0, desF: 0,
  almK: 0, almP: 0, almC: 0, almG: 0, almF: 0,
  merK: 0, merP: 0, merC: 0, merG: 0, merF: 0,
  cenK: 0, cenP: 0, cenC: 0, cenG: 0, cenF: 0,
  colK: 0, colP: 0, colC: 0, colG: 0, colF: 0,
  pasos: 0,
  entreno: false,
});
