/**
 * Textos de ayuda reusados en dos lugares: el tour guiado (AppTour, se ve una
 * sola vez) y los íconos "?" permanentes en cada sección (InfoHint, siempre
 * disponibles). Mantenerlos acá evita que los dos textos se desincronicen.
 */
export const SECTION_HELP = {
  hoy: "Lo primero que ves cada vez que entrás: cuántas kcal llevás consumidas sobre tu objetivo del día (se ajusta solo según los pasos y el entrenamiento que cargues), más tu proteína y pasos. Los botones \"+ Cargar comida\" y \"+ Entrenamiento\" son el atajo más rápido para registrar todo.",
  semana: "Navegá entre semanas con las flechas. Acá está el control de tu peso semanal, los indicadores agregados de la semana (colapsados, tocá para abrir) y el gráfico de kcal por día.",
  ranking: "Clasifica tus días según si llegaste a tu objetivo real de proteína diaria (1.3g por cada kilo de tu peso — el piso para no perder masa muscular). Tocá un día para ver el detalle por comida.",
  herramientas: "Volvé a abrir la calculadora si cambia tu peso o tu meta, cargá una comida contándole a la IA qué comiste, o importá/exportá un respaldo de todos tus datos.",
  tabla: "El detalle día por día de la semana: kcal, proteína, déficit, pasos y entrenamiento. Tocá el círculo de color de un día para cambiar la intensidad de entrenamiento de ese día puntual.",
  pasos: "Si un día se te pasó cargar los pasos desde \"Hoy\", acá podés completarlos para cualquier día de la semana que estés mirando.",
  compras: "Registrá lo que compraste — a mano o sacándole una foto al ticket — para armar tu inventario de la despensa. El Planner de cocina usa este inventario para sugerirte recetas.",
  recetas: "Recetas armadas con lo que tenés en el inventario. Al usar una, se descuentan los ingredientes automáticamente y se suma directo a una comida de tu día.",
  macros: "Cómo se reparten tus kcal entre proteína, carbohidratos y grasas, hoy y durante la semana. El objetivo de proteína es por tu peso; lo que sobra del objetivo de kcal se reparte 50/50 entre carbohidratos y grasas.",
  planificador: "Elegí una receta del catálogo para cada comida de la semana que viene. Con lo que vayas eligiendo se arma sola la lista de lo que te falta comprar, comparando contra tu inventario actual.",
  comidasComunes: "Las comidas que más repetís, agrupadas por desayuno/almuerzo/merienda/cena, con un punto de color según su densidad de proteína (mismo criterio que usa el Ranking para clasificar comidas) — para que notes de un vistazo si lo que repetís tiende a ser bueno o mejorable.",
  actividad: "Pasos, entrenamientos y sueño con más detalle: cuánto te moviste, cuánto quemaste entrenando y cuánto dormiste, día por día de la semana.",
} as const;

export const FIELD_HELP = {
  pesoActual: "Tu peso de hoy. Es la base del cálculo de tu metabolismo — cuánta energía gastás en reposo, antes de sumar actividad.",
  altura: "Entra en la fórmula del metabolismo basal, y también se usa para calcular tu rango de peso saludable (IMC).",
  edad: "El metabolismo basal baja levemente con la edad — se usa para ajustar el cálculo.",
  sexo: "Por diferencias de composición corporal, la fórmula de metabolismo basal varía según esto.",
  pesoObjetivo: "A qué peso querés llegar. Con esto se calcula cuánto déficit diario hace falta.",
  fechaObjetivo: "Para cuándo. Con la fecha se calculan las semanas disponibles y el déficit diario — más lejos en el tiempo es más saludable.",
  pasosDiarios: "Los pasos ajustan tu gasto calórico estimado del día — más movimiento da más margen para comer.",
  pesoSemanal: "Registralo una vez por semana (mismo día, mismo momento del día es lo ideal) para ver tu evolución real, sin el ruido de las variaciones diarias.",
  comidaTexto: "Contale a la IA qué comiste, con la mayor cantidad de detalle posible (cantidades, tipo de cocción) para que el cálculo sea más preciso.",
  ingredientesInventario: "Si nombrás acá los ingredientes que usaste, se descuentan solos de tu inventario de compras al guardar.",
  minutosEntrenamiento: "Cuánto duró la sesión. Junto con la intensidad y tu peso, se usa para estimar las calorías extra que quemaste.",
  ticketTexto: "Pegá el texto del ticket o escribí lo que compraste, un producto por línea o separado por comas.",
  horasSueno: "Cuántas horas dormiste anoche. Es un dato manual, no viene de ningún sensor — cargalo a ojo si no lo medís con algo.",
} as const;
