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
  | "preparado"
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
  // Platos caseros armados con "Preparar plato" (torta, guiso, lasaña...) --
  // se guardan como un producto más, en porciones (unidad "u."), con el
  // valor nutricional por porción ya calculado a partir de lo que se usó.
  { id: "preparado", label: "Comida preparada" },
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

export const WEEKDAY_LABELS_SHORT: Record<Weekday, string> = {
  lunes: "Lun",
  martes: "Mar",
  miercoles: "Mié",
  jueves: "Jue",
  viernes: "Vie",
  sabado: "Sáb",
  domingo: "Dom",
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

/** De dónde salió una Routine -- "asignada" es de solo lectura para el
 * alumno (no la puede editar ni desarmar en LiveWorkout), "personal" es
 * plenamente suya. `undefined` en una rutina ya existente equivale a
 * "personal" -- así las rutinas guardadas antes de este campo (todas las de
 * antes de esta migración de tipos) siguen siendo editables como siempre. */
export type RoutineOrigin = "personal" | "asignada";

/** Rutina reusable (ej. "Día A: Pecho/Tríceps") — plantilla de ejercicios, no un registro de un día puntual. */
export interface Routine {
  id: string;
  nombre: string;
  ejercicios: ExerciseEntry[];
  origen?: RoutineOrigin;
  /** Si origen === "asignada": de qué TrainerRoutine salió y quién la
   * asignó. Es una referencia informativa, no un vínculo vivo -- si el
   * entrenador edita su rutina después, esta copia no se actualiza sola
   * (mismo comportamiento que "Adoptar" ya tenía antes de este campo). */
  trainerRoutineId?: string;
  trainerId?: string;
  assignedAt?: string;
}

/** Qué rutina corresponde a cada día de la semana — se repite todas las semanas hasta que se cambie. */
export type TrainingSchedule = Partial<Record<Weekday, string>>; // weekday -> Routine.id

/** Estado de la postulación para ser entrenador certificado dentro de la app --
 * "ninguno" es el implícito (todavía no se postuló, no hay fila en la tabla). */
export type TrainerStatus = "pendiente" | "aprobado" | "rechazado";

/** Nivel de suscripción del entrenador (por cupo de alumnos, no por
 * funciones -- un entrenador gratis ve exactamente el mismo panel completo,
 * solo con menos lugares). Ver migration_2026-09-21g_add_plan_gating.sql. */
export type TrainerPlanTier = "gratis" | "pago";

export interface TrainerApplication {
  id: string;
  userId: string;
  userEmail: string;
  certificatePath: string;
  status: TrainerStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  trainerPlan?: TrainerPlanTier;
  maxStudents?: number;
}

/** Estado del vínculo -- ver migration_2026-09-21_add_trainer_module.sql.
 * Opcional/no usado todavía por el hook (`useTrainerLink.leave()` sigue
 * haciendo DELETE físico); queda listo para cuando se actualice esa lógica
 * a un "finalizado" que preserve el historial. */
export type TrainerLinkStatus = "activo" | "finalizado";

/** Vínculo entre un alumno y su entrenador (a lo sumo uno por alumno, igual
 * que el "hogar" de la alacena) -- lo que ve el lado ALUMNO. */
export interface TrainerLink {
  trainerId: string;
  trainerEmail: string;
  createdAt: string;
  status?: TrainerLinkStatus;
  endedAt?: string | null;
}

/** Lo que ve el lado ENTRENADOR de un vínculo: uno de sus alumnos. */
export interface TrainerStudent {
  studentId: string;
  studentEmail: string;
  createdAt: string;
}

/** Desvíos registrados al ejecutar una rutina asignada (LiveWorkout) --
 * nunca modifican la rutina en sí, son un registro aparte para que el
 * entrenador los revise. `omitido`/`reemplazado`/`comentario` van atados a
 * un ejercicio planificado puntual; `comentario_final` es de todo el
 * entrenamiento (sin ejercicio); `serie_adicional` y `ejercicio_fuera_de_plan`
 * son desvíos que SÍ se permiten hacer en vivo, pero quedan marcados en vez
 * de mezclarse silenciosamente con lo planificado. Ver
 * migration_2026-09-21c_add_routine_incidents.sql. */
export type RoutineIncidentType =
  | "omitido"
  | "reemplazado"
  | "comentario"
  | "comentario_final"
  | "serie_adicional"
  | "ejercicio_fuera_de_plan";

/** Las 8 tarjetas mínimas que ve el entrenador de un alumno puntual, para
 * la semana que arranca en `weekStart` -- se calculan del lado del server
 * (RPC get_student_metrics, migration_2026-09-21d) para que el entrenador
 * nunca reciba filas crudas de `days`/`user_settings` del alumno, solo
 * estos números ya agregados. `null` en un campo significa "sin datos esa
 * semana", no cero. */
export interface StudentMetrics {
  weekStart: string;
  adherenciaSemanal: number | null; // 0-100, entrenosRealizados/entrenosPlanificados
  entrenosRealizados: number;
  entrenosPlanificados: number;
  pesoActual: number | null;
  cambioPeso: number | null; // vs la semana anterior, puede ser negativo
  proteinaPromedio: number | null;
  pasosPromedio: number | null;
  volumenSemanal: number;
}

/** Un día de la semana del alumno, tal como lo devuelve
 * get_student_week_detail() -- potencia las secciones Entrenamientos y
 * Nutrición de la pantalla de detalle del alumno con una sola llamada. */
export interface StudentDayDetail {
  fecha: string;
  kcal: number;
  proteina: number;
  carbohidratos: number;
  grasas: number;
  pasos: number;
  entreno: boolean;
  entrenoIntensidad: TrainingIntensity | null;
  volumen: number;
}

/** Un punto de la evolución de peso del alumno (get_student_weight_history). */
export interface StudentWeightPoint {
  weekStart: string;
  peso: number;
}

/** Comentario del entrenador a un alumno -- de una sola vía (el alumno lo
 * lee y lo puede marcar como leído, no responde por acá). */
export interface TrainerComment {
  id: string;
  trainerId: string;
  studentId: string;
  texto: string;
  readAt: string | null;
  createdAt: string;
}

export interface RoutineIncident {
  id: string;
  studentId: string;
  trainerId: string;
  fecha: string; // YYYY-MM-DD, el día del entrenamiento
  routineId: string; // Routine.id local (Settings.routines del alumno)
  routineNombre: string;
  trainerRoutineId: string | null;
  tipo: RoutineIncidentType;
  /** Null solo en comentario_final. */
  ejercicioNombre: string | null;
  detalle: string | null;
  vistoPorEntrenador: boolean;
  createdAt: string;
}

/** Solicitud de vinculación -- usar un código de invitación ya no crea el
 * vínculo al instante, crea esto. Queda "pendiente" hasta que el
 * entrenador la acepta (crea la fila en TrainerLink) o la rechaza (acá
 * termina, nunca se crea el vínculo). Ver
 * migration_2026-09-21b_add_trainer_link_requests.sql. */
export type TrainerLinkRequestStatus = "pendiente" | "aceptada" | "rechazada";

export interface TrainerLinkRequest {
  id: string;
  trainerId: string;
  studentId: string;
  trainerEmail: string;
  studentEmail: string;
  status: TrainerLinkRequestStatus;
  respondedAt: string | null;
  responseNote: string | null;
  createdAt: string;
}

/** Solo una rutina "publicada" es asignable en un TrainingPlan -- "borrador"
 * deja seguir editando sin que aparezca todavía en el selector del
 * planificador, "archivada" la saca de circulación sin romper las
 * assigned_sessions que ya la referencian (esas guardan una copia congelada,
 * no una referencia viva). */
export type RoutineStatus = "borrador" | "publicada" | "archivada";

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
  /** Opcional para no romper filas/objetos ya construidos sin este campo
   * (agregado en migration_2026-09-21_add_trainer_module.sql, default
   * "publicada" en la base). */
  status?: RoutineStatus;
}

/** Planificación de UNA semana para UN alumno: qué rutina (id de
 * TrainerRoutine) va cada día. El alumno no interactúa con esto
 * directamente -- lo ve reflejado en las AssignedSession que se generan al
 * publicar (ver `publish_training_plan` en la migración). */
export type TrainingPlanStatus = "borrador" | "publicado";

export interface TrainingPlan {
  id: string;
  trainerId: string;
  studentId: string;
  /** Lunes de la semana, YYYY-MM-DD (misma convención que isoMonday()). */
  weekStart: string;
  days: Partial<Record<Weekday, string>>; // weekday -> TrainerRoutine.id
  status: TrainingPlanStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Instancia concreta y fechada de un entrenamiento -- lo único que el
 * alumno mueve o ejecuta. `routineSnapshot`/`routineNombre` quedan
 * congelados al momento de asignar, así editar la rutina original después
 * no altera sesiones ya asignadas.
 *
 * Máquina de estados: planificada -> movida -> en_curso -> completada,
 * con las salidas vencida (pasó la fecha sin abrirla ni moverla) y
 * cancelada (el entrenador la da de baja). Las transiciones reales las
 * impone un trigger en la base (ver `trg_guard_assigned_sessions_update`),
 * no alcanza con el tipo. */
export type AssignedSessionStatus =
  | "planificada"
  | "movida"
  | "en_curso"
  | "completada"
  | "vencida"
  | "cancelada";

export interface AssignedSession {
  id: string;
  planId: string;
  trainerId: string;
  studentId: string;
  routineId: string | null;
  routineSnapshot: ExerciseEntry[];
  routineNombre: string;
  fechaPlanificada: string; // YYYY-MM-DD, puede cambiar si se mueve
  fechaOriginal: string; // YYYY-MM-DD, no cambia nunca
  status: AssignedSessionStatus;
  movedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Lo que realmente pasó al ejecutar una AssignedSession -- 0..1 respecto a
 * ella (nace recién cuando el alumno la cierra). `ejercicios` reutiliza el
 * mismo shape que ya usa LiveWorkout (ExerciseEntry con sets reales:
 * repeticiones/peso/intensidad = esfuerzo). */
export interface WorkoutExecution {
  id: string;
  sessionId: string;
  studentId: string;
  trainerId: string;
  ejercicios: ExerciseEntry[];
  duracionMinutos: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Las 4 incidencias que el alumno puede informar durante o después de una
 * ejecución. No incluye "salteé toda la sesión" -- eso se refleja en el
 * estado `vencida` de la sesión, no como incidencia. */
export type IncidentType = "omitido" | "reemplazado" | "serie_adicional" | "comentario_libre";

export interface Incident {
  id: string;
  executionId: string;
  studentId: string;
  trainerId: string;
  tipo: IncidentType;
  /** Null en comentario_libre general -- no apunta a un ejercicio puntual. */
  ejercicioNombre: string | null;
  /** Texto libre, o el nombre del ejercicio de reemplazo si tipo="reemplazado". */
  detalle: string | null;
  vistoPorEntrenador: boolean;
  createdAt: string;
}

/** Mensaje del entrenador al alumno -- de una sola vía en esta versión (el
 * alumno no responde acá; su "comentario libre" ya es una Incident). */
export type ObservationScope = "session" | "week" | "general";

export interface Observation {
  id: string;
  trainerId: string;
  studentId: string;
  scope: ObservationScope;
  /** No-null solo si scope === "session". */
  sessionId: string | null;
  /** No-null solo si scope === "week" (lunes de esa semana). */
  weekStart: string | null;
  texto: string;
  readAt: string | null;
  createdAt: string;
}

/** Snapshot de métricas de un alumno en un período, armado por el
 * entrenador -- sobrevive a que el vínculo se finalice (a diferencia de
 * AssignedSession/Incident, que dejan de ser legibles para el entrenador
 * una vez desvinculado). */
export type ReportStatus = "borrador" | "generado" | "enviado";

export interface Report {
  id: string;
  trainerId: string;
  studentId: string;
  periodStart: string;
  periodEnd: string;
  status: ReportStatus;
  /** Ver la sección de métricas del diseño del módulo (adherencia, volumen,
   * distribución de incidencias, etc.) -- shape libre a propósito, se
   * define del lado de la app al calcular el reporte, no en la base. */
  metrics: Record<string, unknown>;
  trainerComment: string | null;
  generatedAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

/** Shape real de `Report.metrics` para un reporte generado por
 * generate_student_report() -- mismos 8 campos de StudentMetrics más el
 * desglose de incidencias del período. `Report.metrics` se deja tipado
 * como Record<string, unknown> a propósito (ver arriba); esto es solo
 * para leerlo del lado de la UI sin castear campo por campo. */
export interface WeeklyReportMetrics extends StudentMetrics {
  incidenciasTotal: number;
  incidenciasPorTipo: Partial<Record<RoutineIncidentType, number>>;
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
  /** Si este item se cargó desde "Desde Alacena", el id del InventoryItem del
   * que se descontó stock. Sin esto, editar o borrar el item después dejaba
   * la alacena desincronizada de lo que de verdad se comió. */
  fuenteAlacenaId?: string;
  /** Cuánto se descontó, EN LA UNIDAD DEL ITEM DE ALACENA (no siempre gramos:
   * para "u." son unidades). Es la cantidad contra la que se calcula el
   * delta al editar — puede diferir de "gramos" para items en "u.". */
  fuenteCantidad?: number;
  fuenteUnidad?: InventoryItem["unit"];
  /** Datos mínimos para RECREAR el producto en la alacena si ya se borró por
   * haber llegado a 0 (consumeAmounts elimina los items que quedan en cero). */
  fuenteSnapshot?: {
    name: string;
    category?: InventoryCategory;
    nutritionPer100g?: InventoryNutrition;
    zona?: InventoryZone;
  };
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
export type InicioBlockId = "hoy" | "peso" | "objetivo" | "seguimiento" | "comidasSemana";
export const DEFAULT_INICIO_ORDER: InicioBlockId[] = [
  "hoy",
  "peso",
  "objetivo",
  "seguimiento",
  "comidasSemana",
];
export const INICIO_BLOCK_LABELS: Record<InicioBlockId, string> = {
  hoy: "Hoy",
  peso: "Peso de esta semana",
  objetivo: "Tu objetivo",
  // Antes eran tres bloques separados (Indicadores, Kcal por día y Tabla de
  // la semana) -- se unificaron en uno solo a pedido del usuario, con las
  // tres partes juntas adentro en vez de tener que abrir/cerrar tres
  // tarjetas distintas para ver lo mismo de la semana.
  seguimiento: "Seguimiento semanal",
  // Antes había, además, un bloque separado "Editar comidas de hoy" que
  // hacía lo mismo que esto pero solo para hoy -- unificado en uno solo
  // (este ya soporta cualquier día de la semana, incluido hoy por default).
  comidasSemana: "Modificar comidas de la semana",
};

/** La solapa Comidas antes tenía dos sub-solapas (Alacena/Planificado) --
 * unificadas en una sola tira continua a pedido del usuario, para no tener
 * que ir y volver entre las dos. Todos los bloques conviven en un mismo
 * orden ahora. */
export type ComidasBlockId = "hogar" | "alacena" | "sugerencias" | "comunes" | "planificador";
// "comunes" (Comidas más comunes) sigue existiendo -- la memoria atrás
// (useMealMemory) sigue guardando y alimentando sugerencias en otros
// lados -- pero se sacó del orden por default a pedido del usuario: la
// tarjeta en sí todavía no muestra nada realmente útil ("lo más común es
// esto, bueno, nada"), así que por ahora queda oculta para todos hasta
// que se le sume algo de verdad (ej. calificar si esas comidas son
// buenas o no). Se puede reactivar agregándola de nuevo acá.
export const DEFAULT_COMIDAS_ORDER: ComidasBlockId[] = ["hogar", "alacena", "sugerencias", "planificador"];
export const COMIDAS_BLOCK_LABELS: Record<ComidasBlockId, string> = {
  hogar: "Grupo compartido",
  alacena: "Alacena",
  sugerencias: "Sugerencias de recetas",
  comunes: "Comidas más comunes",
  // Antes era su propia sección aparte ("Compras") con el mismo nombre que
  // el botón de Alacena -- unificada ahí adentro, como la opción "Con
  // ticket" al agregar productos.
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

export type MacrosBlockId = "resumen" | "ranking" | "reporte" | "cruceEntreno" | "diversidad" | "tabla";
export const DEFAULT_MACROS_ORDER: MacrosBlockId[] = [
  "resumen", "ranking", "reporte", "cruceEntreno", "diversidad", "tabla",
];
export const MACROS_BLOCK_LABELS: Record<MacrosBlockId, string> = {
  resumen: "Hoy · Macros",
  ranking: "Ranking de días",
  // Antes eran tres bloques separados (Macros de la semana, Proteína vs
  // objetivo, Fibra de la semana) -- unificados en un solo reporte con un
  // gráfico corto por macro (kcal, proteína, carbohidratos, grasas, fibra)
  // más uno de densidad calórica, para ver de un vistazo cómo viene la
  // semana completa sin ir abriendo tarjeta por tarjeta.
  reporte: "Reporte semanal",
  cruceEntreno: "Comida vs. entrenamiento",
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

/** Básico (gratis) / Premium / Premium+ -- ver migration_2026-09-21g_add_plan_gating.sql.
 * Sin `plan` guardado todavía (cuentas viejas) se trata como "basico". La
 * diferencia entre Premium y Premium+ es solo el número de cupos de
 * vínculo profesional (1 vs. 2) -- las herramientas que desbloquea el pago
 * son las mismas en los dos. */
export type ClientPlan = "basico" | "premium" | "premium_plus";

export interface Settings {
  goal: number; // kcal objetivo diario de consumo
  plan?: ClientPlan;
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

/** Sugerencias de categoría al guardar una preparación -- no es una lista
 * cerrada, el usuario puede escribir cualquier otra. */
export const PREPARATION_CATEGORY_SUGGESTIONS = ["Almuerzos", "Cenas", "Meriendas", "Desayunos", "Viandas", "Repostería"];

/** Combo de varios ingredientes que se repite (ej. "Milanesa con arroz y
 * arvejas") -- guarda la ESTRUCTURA (qué lleva), no cantidades fijas: cada
 * vez que se cocina puede ser una cantidad distinta, así que al reusarla
 * solo se recuerdan los nombres de los ingredientes, no gramos. Vive en
 * localStorage (lib/useMealPreparations.ts), es un hábito personal por
 * dispositivo, igual que la memoria de comidas. */
/** Un ingrediente de una preparación, CON cantidad -- misma forma que
 * ParsedInventoryEntry (lib/foodText.ts) a propósito: el texto que escribe
 * la persona para desglosar un plato se parsea con el mismo parser que ya
 * usa la Alacena, no hay una segunda forma de decir lo mismo en el código. */
export interface PreparationIngredient {
  nombre: string;
  cantidad: number;
  unidad: "g" | "ml" | "u.";
}

export interface MealPreparation {
  id: string;
  nombre: string;
  categoria: string;
  ingredientes: string[];
  /** Con cantidades -- si está y cada ingrediente resuelve contra la tabla
   * `foods`, reusar esta preparación puede armar la comida directo, sin
   * pasar por la IA. Preparaciones guardadas antes de esto no lo tienen y
   * siguen funcionando igual que siempre (solo con "ingredientes"). */
  ingredientesDetalle?: PreparationIngredient[];
  /** Rinde N porciones -- un plato como una tarta se cocina entero y se come
   * un pedazo, no todo junto. */
  porciones?: number;
  meal?: MealKey;
  vecesUsada: number;
  createdAt: string;
  updatedAt: string;
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
