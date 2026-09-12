# Backlog — App Nutrición

Reemplaza a `BACKLOG_APP_NUTRICION.xlsx` (ese archivo nunca fue un Excel real,
era texto plano). Esta es la versión viva: la vamos actualizando a medida que
completamos tareas.

Leyenda: `[x]` hecho · `[~]` parcial / en curso · `[ ]` sin empezar

## Tareas

- [x] 1. Preparar el proyecto para web real en Vercel
      — código listo, falta el paso de deploy en sí (tarea 6)
- [x] 2. Confirmar Supabase real con auth por email
- [x] 3. Verificar RLS y persistencia por usuario
      — `supabase/schema.sql` + `app/api/data` nunca acepta `user_id` del cliente
- [x] 4. Quitar bloqueos de auth local para trabajar sin Google
      — funciona en modo local con `localStorage` si Supabase no está configurado
- [x] 5. Probar flujo de login con email magic link
- [x] 6. Hacer deploy en Vercel de la app web
      — https://nutriapp-rose-six.vercel.app, deploy automático desde `main` funcionando
- [x] 7. PWA / íconos / manifest
- [~] 8. Revisar UX base de la app
      — quedan botones/paneles a revisar caso por caso; ver sección "UX pendiente" abajo
- [x] 9. Mejorar registro de comida por IA
      — `AiEntryForm.tsx` + `/api/parse-meal`
- [x] 10. Validar cálculos diarios y métricas
      — `lib/calculations.ts`, y `RecipePlanner` ahora muestra kcal restantes del día
- [x] 11. Crear pantalla de "hoy" para registro rápido
      — `TodayCard.tsx`: siempre visible arriba de todo, muestra kcal consumidas/restantes
      y proteína de hoy, pasos y entrenamiento editables al toque, y acceso directo a
      "Cargar comida" (abre `AiEntryForm`, que ya cubre la carga manual/IA)
- [x] 12. Verificar pasos y entreno
      — pasos editables por día (`DailySteps.tsx`, recién conectado) + intensidad de entreno en `Ledger.tsx`
- [x] 13. Añadir configuración de objetivo y ajustes
      — `GoalCalculator.tsx`
- [x] 14. Mejorar comparativas semanales
      — `WeeklyChart.tsx` + navegación entre semanas
- [ ] 15. Definir métricas para clientes / gimnasio
- [ ] 16. Armar MVP para app Android vía Capacitor
- [ ] 17. Diseñar íconos y splash para APK
- [x] 18. Pruebas en dispositivo real
      — login (magic link + Google) y "Agregar a pantalla de inicio" (PWA) probados
      y funcionando en el celular
- [ ] 19. Versionado y release notes
- [~] 20. Ideas futuras: recetas, historial, export, coach dashboard
      — `RecipePlanner.tsx` y `ShoppingLog.tsx` avanzados; `DataImport.tsx` (import/export de respaldo)
      recién conectado bajo el botón "Datos"; falta historial y coach dashboard

## Ideas generales (sin priorizar)

- Dashboard de progreso por mes
- Ranking por densidad proteica (ya existe una versión semanal en `RankingCard.tsx`)
- Reportes por semana
- Guardado de recetas favoritas
- Notificaciones de entrenamiento / comida
- Modo "coach" para ver clientes
- Exportación CSV / PDF (hoy `DataImport` solo importa/exporta JSON crudo)
- Integración con sensores o Apple Health
- Filtros por objetivo / déficit
- Vista de "mañana" y "hoy"

## UX pendiente (detectado en la revisión del 2026-09-09)

- Confirmar que los 4 botones de acción (Objetivo / Cargar con IA / Ranking / Datos)
  tienen labels claros para alguien que no conoce la app.
- Pensar si "Datos" (import/export) debería vivir en un ajuste separado en vez de
  compartir grilla con las acciones diarias.
- ~~"Pasos de la semana" y "Compras / ticket" ahora arrancan colapsadas~~ (hecho 2026-09-09,
  `Collapsible.tsx`)

## UX grande pendiente (pedido 2026-09-09, sin implementar todavía salvo lo marcado)

1. [x] Sugerencia de peso objetivo por IMC + altura en `GoalCalculator` (rango
       saludable IMC 18.5–24.9, botón "usar sugerencia" que respeta máx. 1kg/semana).
2. [x] / 5. [x] Onboarding guiado (`OnboardingWizard.tsx`): login → calculadora de
       objetivo (paso 1) → peso actual + pasos típicos (paso 2, opcionales) → recién
       ahí se desbloquea el resto de la app. `page.tsx` ahora usa el estado
       `authenticated` (antes se guardaba pero nunca se usaba) para bloquear la app
       hasta el login, y `!settings.calculatorProfile` para mostrar el wizard en vez
       del viejo modal de calculadora que se autoabría sobre toda la app.
3. [x] Layout distinto para PC/escritorio. `app/layout.tsx` forzaba
       `max-w-[480px]` para cualquier tamaño de pantalla — en PC se veía como un
       celular angosto en el medio de un monitor ancho. Ahora es `max-w-[480px]
       lg:max-w-6xl`, y en `app/page.tsx` el contenido principal (a partir de
       `lg:`) pasa a un grid de 2 columnas: izquierda Hoy + Semana del... +
       Ranking, derecha Herramientas + Tabla + Pasos + Compras + Planner. En
       mobile el grid es de 1 columna y el orden queda idéntico a como estaba
       (los dos `<div>` de columna se leen uno tras otro). Login y onboarding se
       mantienen angostos y centrados (`max-w-md`) en cualquier tamaño de
       pantalla, para no estirar esos formularios de un solo foco.
4. [~] Más info contextual por sección — qué hace y para qué sirve cada ítem.
       Implementado dentro del paso 1 del onboarding (`GuidedGoalCalculator.tsx`):
       ahora pide un dato a la vez (modo → peso → altura → edad → sexo → [meta →
       fecha] → resultado) con un cuadro "¿Para qué sirve?" en cada paso, en vez
       de mostrar todo el formulario junto. Los pasos de peso/pasos del wizard
       también tienen su propio "¿Para qué sirve?". Además se agregó
       `AppTour.tsx`: tras terminar el onboarding (una sola vez, controlado por
       `settings.tourDone`), un recorrido de 8 tarjetas sobre la app real (Hoy,
       Semana, Ranking, Herramientas, Tabla, Pasos, Compras, Planner) explicando
       para qué sirve cada sección. Sigue faltando info contextual permanente en
       cada sección para cuando el usuario ya vio el tour y quiere repasar algo
       (tooltips o texto expandible tipo "¿Qué es esto?" en cada tarjeta).

Los 5 pedidos originales están resueltos. Queda pendiente la info contextual
permanente (parte del ítem 4) para cuando alguien ya vio el tour y quiere repasar
algo puntual.

## Registro de cambios

- **2026-09-09**: arreglado build roto (`RecipePlanner` pedía `dailyGoal`/`consumedKcal`
  que `page.tsx` no pasaba). Conectados `DailySteps.tsx` y `DataImport.tsx`, que existían
  como componentes huérfanos sin usar. Reemplazado el botón duplicado "Consumo / objetivo"
  por "Datos" (abre `DataImport`).
- **2026-09-09**: primer intento de deploy en Vercel falló — `lib/useLocalDays.ts`
  importaba `@/registro_export.json` (datos personales, gitignoreados) como seed para
  usuarios nuevos, y Vercel no podía resolver el import. Se sacó el seed: usuarios/
  dispositivos nuevos ahora arrancan vacíos, que es lo correcto para un producto real.
- **2026-09-09**: deploy en Vercel (https://nutriapp-rose-six.vercel.app) probado en
  celular real. Magic link por email funcionó de entrada. Login con Google daba
  `redirect_uri_mismatch` — faltaba autorizar `https://<project-ref>.supabase.co/auth/v1/callback`
  en Google Cloud Console (Credentials → OAuth Client). Ambos métodos de login
  funcionan ahora en producción. (No fue un cambio de código, solo de config.)
- **2026-09-09**: agregado `TodayCard.tsx` (tarea #11). Se extrajo `INTENSITY_STYLES`
  a `lib/types.ts` para compartirlo entre `Ledger.tsx` y `TodayCard.tsx` sin duplicar.
- **2026-09-09**: usuario reportó que en la tarjeta Hoy los botones de entrenamiento
  "no reaccionan" y los pasos "no se reflejan en otro lado". Se probó el mismo código
  con un navegador automatizado (Playwright) contra el dev server local: el click sí
  cambia el estilo del botón al instante y el valor de pasos se guarda correctamente
  en `localStorage`. No se pudo reproducir el bug en ese entorno — sospecha de timing
  con el deploy de Vercel todavía en curso al momento de la prueba, o algo específico
  del dispositivo/navegador real. Pendiente confirmar si persiste tras el redeploy.
- **2026-09-09**: agregado `Collapsible.tsx` y aplicado a `DailySteps.tsx` (Pasos de
  la semana) y `ShoppingLog.tsx` (Ticket / foto) — ambas secciones arrancan cerradas
  y se despliegan al tocar el header, a pedido del usuario (ya no son necesarias todo
  el tiempo ahora que existe `TodayCard`, pero se mantienen como respaldo).
- **2026-09-09**: rediseñada `TodayCard.tsx` a pedido del usuario: ahora es una vista
  de resumen de solo lectura (barra de kcal consumidas/objetivo ajustado + 3 datos:
  restantes, proteína, pasos) en vez de tener los controles editables mezclados. El
  "objetivo ajustado" usa `dayGoal()` de `lib/calculations.ts`, así que varía solo con
  los pasos/entrenamiento cargados del día. La edición de pasos + intensidad de
  entrenamiento se movió a un panel nuevo (`TrainingEntryForm.tsx`, botón
  "+ Entrenamiento") con un botón "Guardar" explícito, siguiendo el mismo patrón que
  "+ Cargar comida" (que sigue abriendo `AiEntryForm` sin cambios).
- **2026-09-09**: "Indicadores" (`SummaryCards`) y "Tabla de la semana" (`Ledger`)
  ahora también arrancan colapsados con `Collapsible.tsx`, para que lo primero que se
  vea de la sección semanal sea el gráfico.
- **2026-09-09**: `WeeklyWeight` ("Control semanal") se movió adentro de la tarjeta
  "Semana del ..." en vez de ser una tarjeta suelta aparte. El botón "+ Entrenamiento"
  de `TodayCard` ahora muestra la intensidad ya cargada (ej. "Exigente") con el mismo
  color que usa `INTENSITY_STYLES`, en vez de un botón genérico sin estado. Se mejoró
  visualmente la barra de sesión activa en `AuthPanel.tsx` (avatar con inicial,
  indicador de "sesión activa", botón "Salir" con hover en rojo).
- **2026-09-09**: reestructurada la sección semanal a pedido del usuario. "Indicadores"
  (`SummaryCards`) y `WeeklyChart` ahora viven dentro de la tarjeta "Semana del ...";
  el gráfico se ve siempre, "Indicadores" sigue colapsado. Se sacó el grid de 4 botones
  (Objetivo/Datos/Cargar con IA/Ranking): ahora "Objetivo" y "Cargar con IA" comparten
  una sección colapsable ("Calculadora y carga con IA"), "Datos" quedó como botón
  suelto, y `RankingCard` (ya renombrado "Ranking de días", con su propio colapsable
  interno) se renderiza directo en la página en vez de abrir como modal — separado de
  la sección de calculadora/IA.
- **2026-09-09**: bug real encontrado — `upsertDay`/`saveSettings` en `lib/useLocalDays.ts`
  nunca revisaban `response.ok` del PUT a `/api/data`, así que un guardado rechazado por
  Supabase (401/500) fallaba en silencio y el usuario nunca se enteraba de que el cambio
  no llegó a la nube. Se agregó chequeo de `response.ok` + un `syncError` visible en la
  UI (banner rojo debajo del header) tanto para fallos de guardado como de carga inicial.
  Usuario confirmó que usa la misma cuenta en PC y celu, así que se descartó el caso de
  cuentas distintas.
- **2026-09-09**: causa raíz encontrada gracias al banner con detalle: la base de
  Supabase real del usuario es más vieja que `supabase/schema.sql` — le faltaba la
  columna `user_settings.weekly_weights` (y probablemente `calculator_profile`,
  `days.peso_kg`, `days.entreno_minutos`, `days.entreno_intensidad`, agregadas al
  esquema en commits posteriores a cuando corrió el script original). Se agregó
  `supabase/migration_2026-09-09_add_missing_columns.sql` con `alter table ... add
  column if not exists` para que el usuario la corra una vez en el SQL Editor.
  Confirmado: usuario corrió la migración y el sync ya funciona entre dispositivos.
- **2026-09-09**: arreglada inconsistencia en `RankingCard`: el color rojo/verde de cada
  día salía por posición relativa (mejores 3 / peores 3), mientras que el detalle por
  comida usaba un umbral fijo (2.5g/100kcal = bueno). Un día con densidad 4.6 (bueno por
  umbral) podía salir en rojo solo por haber otros días con más. Se creó
  `proteinQualityTier()` en `lib/calculations.ts` como única fuente de verdad, usada
  tanto para clasificar cada día (ahora "Buenos días" / "Días para mejorar" según el
  umbral, no por posición) como cada comida en el detalle. Se agregó leyenda de colores
  y un bloque de tips para subir la densidad proteica.
- **2026-09-09**: rediseñado `WeeklyWeight` a pedido del usuario: una vez cargado el
  peso de la semana, el botón grande desaparece y queda una fila discreta con el peso,
  la comparación vs la semana anterior (flecha + color según si el modo de objetivo es
  "perder"/"aumentar"/"recomponer") y una racha 🔥 de semanas seguidas con peso cargado.
- **2026-09-09**: cambiado el criterio de "bueno/medio/malo" del ranking de días a
  pedido del usuario — antes usaba densidad de proteína (g/100kcal), que consideró
  demasiado fácil de lograr. Ahora `proteinDailyTier()` compara la proteína TOTAL del
  día contra un objetivo real de mantenimiento muscular: `1.6g × peso corporal`
  (constante citada en nutrición deportiva como piso para no perder masa magra en
  déficit). Bueno = llegó al objetivo, medio = 90–100% del objetivo, malo = menos del
  90%. El peso se toma del último dato disponible (peso diario cargado > peso semanal
  > peso del perfil de la calculadora > 75kg de fallback). El detalle por comida sigue
  usando la densidad por caloría sin cambios, porque ahí compara comidas entre sí, no
  contra un objetivo diario.
- **2026-09-09**: agregado `bmiInfo()` (sugerencia de peso objetivo por IMC) en
  `GoalCalculator`. Bug reportado: al cerrar sesión y tocar "Continuar con Google" de
  nuevo, Google reloguea directo con la última cuenta sin dejar elegir — no es un bug
  nuestro, es que la cookie de sesión de Google en el navegador sigue viva aunque
  cerremos la sesión de Supabase. Arreglado agregando `queryParams: { prompt:
  "select_account" }` a `signInWithOAuth` en `AuthPanel.tsx`, que fuerza a Google a
  mostrar siempre el selector de cuenta.
- **2026-09-09**: reemplazado el paso 1 del onboarding (formulario completo de la
  calculadora) por `GuidedGoalCalculator.tsx` — pregunta un dato a la vez (modo, peso,
  altura, edad, sexo, y si el modo es "perder" también meta + fecha) con Atrás/
  Siguiente y un cuadro "¿Para qué sirve?" en cada paso, y recién al final muestra el
  resultado. Se extrajo `computeGoal()` y `bmiInfo()` a `lib/calculations.ts` para que
  la calculadora rápida (edición posterior desde "Herramientas") y la guiada usen
  exactamente la misma fórmula sin duplicar lógica. Los pasos de peso/pasos del wizard
  (después de la calculadora) también se separaron en pantallas individuales con su
  propia explicación. Nota para más adelante: `calcGoalDeficit` ya calcula un flag
  `esAgresivo` (déficit >30% del gasto o >1% del peso corporal por semana) pero
  ninguna de las dos UIs lo muestra — vale la pena agregar una advertencia visible
  cuando el objetivo sugerido sea demasiado agresivo.
- **2026-09-09**: agregado `AppTour.tsx` — recorrido de 8 tarjetas que se muestra una
  sola vez, justo después de terminar el onboarding, con overlay sobre la app real de
  fondo (no una pantalla en blanco aparte). Controlado por `settings.tourDone`
  (persistido, no vuelve a aparecer). Se puede saltear en cualquier momento.
- **2026-09-09**: bajado el umbral del ranking de proteína de 1.6g/kg a 1.3g/kg a
  pedido del usuario (lo encontró más alcanzable). Cambiado en `proteinTargetForWeight()`
  y en los textos de `RankingCard.tsx` y `AppTour.tsx` que mencionaban el número viejo.
- **2026-09-09**: tanda grande de pedidos (numerados 6 a 14 en la conversación):
  1. Google Sheets como base de datos → **no implementado, se explicó por qué no
     conviene** (sin RLS real, límites de API, auth por usuario más compleja que
     Supabase). Se sugirió en cambio un futuro "exportar a Sheets" como reporte,
     no como base.
  2. Selector de ritmo de pérdida en `GuidedGoalCalculator`: botones de
     0.25/0.5/0.75/1 kg por semana en el paso de fecha, que calculan la fecha
     automáticamente, más feedback en vivo ("con esa fecha, el ritmo es de Xkg
     por semana") si el usuario toca una fecha a mano.
  3. Onboarding: sacada la pregunta de peso duplicada (ya se pedía en la
     calculadora); el paso de "pasos típicos" pasó a ser "nivel de actividad"
     (Leve/Moderado/Alto/Exigente) con descripción de cada uno y un valor de
     pasos representativo por nivel (3000/6000/9000/12000).
  4. `AiEntryForm`: lista de sugerencias de comidas comunes (chips que llenan el
     texto al tocarlas) + botón de dictado por voz con la Web Speech API del
     navegador (se oculta solo si el navegador no la soporta, ej. Safari viejo).
  5. **Bug real encontrado y arreglado**: `settings.tourDone` nunca se guardaba
     ni se leía en `/api/data` — por eso el tour volvía a aparecer en cada carga
     para cuentas sincronizadas con Supabase (el GET pisaba `tourDone` con
     `undefined` siempre). Se agregó la columna `tour_done` a
     `supabase/schema.sql` + migración
     (`migration_2026-09-09b_add_tour_done.sql`) y se incluyó en el GET/PUT de
     `app/api/data/route.ts`.
  6. Modales cerrables con click afuera o tecla Escape: nuevo hook
     `lib/useEscapeKey.ts`, aplicado en los 4 modales de `page.tsx`
     (calc/ai/entreno/datos), `WeeklyWeight`, `Ledger` y `AppTour`. Click afuera
     ya lo tenían `WeeklyWeight` y `Ledger`; se agregó a los demás.
  7. Límites en campos de texto/número (`lib/inputLimits.ts`): números tope 6
     dígitos (kcal, kg, pasos, edad, altura), minutos tope 4 dígitos, texto libre
     tope 500 caracteres. Aplicado en `GoalCalculator`, `GuidedGoalCalculator`,
     `TrainingEntryForm`, `DailySteps`, `WeeklyWeight`, `AiEntryForm`,
     `ShoppingLog`.
  8. Descripción de cada intensidad de entrenamiento debajo de los botones en
     `TrainingEntryForm` (ya existía en el modal de `Ledger`, reutiliza el mismo
     campo `description` de `INTENSITY_STYLES`).
  9. Ranking de días: en vez de listar todos los días agrupados en dos baldes
     (buenos / para mejorar) sin límite, ahora muestra como máximo "los 3
     mejores", "los 3 del medio" y "los 3 peores" por posición, sin superponerse
     entre grupos (con pocos días, el grupo del medio puede quedar vacío o con
     menos de 3).
- **2026-09-09**: bug real de mobile — `input, select, textarea` tenían
  `font-size: 13px` en `globals.css`. Cualquier campo con letra menor a 16px
  dispara el zoom automático de Safari/Chrome al tocarlo en el celular, lo que
  el usuario vio como "hace zoom y queda por fuera de la pantalla" al abrir
  modales. Subido a 16px en mobile (13px se mantiene desde `lg:` para no
  cambiar el aspecto en desktop). También se agregó `overflow-x: hidden` +
  `max-width: 100vw` en `html, body` como red de seguridad para que nada quede
  más ancho que la pantalla, sin afectar el scroll vertical.
- **2026-09-10**: soporte para más de un entrenamiento por día (pedido: cinta +
  gimnasio el mismo día). `DayEntry.entrenamientos?: TrainingSession[]` es el
  formato nuevo; se mantienen `entreno`/`entrenoIntensidad`/`entrenoMinutos`
  como formato viejo para compatibilidad. `getTrainingSessions()` en
  `lib/calculations.ts` es la única fuente de verdad para leer las sesiones de
  un día (usa `entrenamientos` si existe, si no arma una sesión desde los
  campos viejos) — `estimateTrainingCalories` ahora suma el gasto de todas las
  sesiones. `TrainingEntryForm` (botón "+ Entrenamiento" en Hoy) es la pantalla
  para armar la lista: agregar intensidad+minutos, ver cada sesión con su
  gasto, y sacarlas. `TodayCard` muestra "N entrenamientos" cuando hay más de
  uno. `Ledger` (tabla semanal) y `AiEntryForm` siguen siendo editores rápidos
  de una sola sesión por día — al usarlos reemplazan la lista completa de ese
  día por esa única sesión (no la combinan), para que sigan siendo simples.
  Agregada columna `entrenamientos jsonb` a Supabase (schema.sql + migración
  `migration_2026-09-09c_add_entrenamientos.sql`). Usuario corrió las 3
  migraciones pendientes (columnas faltantes, tour_done, entrenamientos) —
  confirmado "Success" en las 3.
- **2026-09-10**: `RankingCard` movido de la primera a la segunda columna en
  escritorio, a pedido del usuario (para equilibrar mejor las dos columnas).
- **2026-09-10**: `Collapsible.tsx` ahora limita la altura del contenido
  abierto a `60vh` con scroll interno (prop `scrollable`, default `true`), así
  desplegar una sección larga (tabla, lista de compras, recetas) no empuja
  demasiado el resto de la página — el scroll queda contenido adentro de esa
  sección. `RankingCard` usa `scrollable={false}` porque su tooltip al pasar
  el mouse es un elemento posicionado `absolute` que quedaría cortado por el
  contenedor con `overflow: auto`; de todos modos está naturalmente acotado
  (máximo 9 días).
- **2026-09-10**: **bug real de huso horario** — `fmtDate()` usaba
  `date.toISOString()`, que siempre da la fecha en UTC. En un huso horario
  detrás de UTC (Argentina, UTC-3), pasada cierta hora de la noche ya es
  "mañana" en UTC aunque localmente siga siendo hoy — por eso la app mostraba
  el día siguiente en el celular. Cambiado a construir la fecha con
  `getFullYear()/getMonth()/getDate()` (huso horario local del dispositivo).
  Se usa en toda la app a través de esta única función, así que se arregló en
  un solo lugar; también se corrigió un uso suelto de `toISOString()` en
  `AiEntryForm.tsx` que no pasaba por `fmtDate()`. Probado simulando huso
  horario de Buenos Aires con la hora justo después de medianoche UTC — la
  fecha local se mantiene correcta.
- **2026-09-10**: ayuda contextual permanente en toda la app (cierra el ítem 4
  del pedido grande). Nuevo `lib/helpText.ts` centraliza los textos —
  `AppTour.tsx` (el tour de una sola vez) y los íconos "?" permanentes usan
  exactamente el mismo texto por sección, para que no se desincronicen. Nuevo
  `components/InfoHint.tsx`: un ícono "?" que se abre/cierra con un tap (no
  con hover, para que funcione igual en mobile y desktop), con Escape y click
  afuera para cerrar. `Collapsible.tsx` ahora acepta un prop `info` opcional
  que agrega el ícono junto al título — como todas las secciones colapsables
  ya lo usan (Indicadores, Ranking, Herramientas, Tabla, Pasos, Compras), fue
  un solo cambio central. Se agregó a mano en "Hoy", "Semana del" y "Planner
  de cocina" (no son `Collapsible`). También se agregaron íconos de ayuda por
  CAMPO (no solo por sección) en los formularios más usados: `GoalCalculator`,
  `AiEntryForm`, `TrainingEntryForm`, `WeeklyWeight` — la calculadora guiada
  del onboarding ya tenía su propia caja "¿Para qué sirve?" por paso, así que
  no se duplicó ahí.
- **2026-09-10**: objetivos poco saludables ahora se **bloquean**, no solo se
  advierten (pedido explícito del usuario: "que no te deje plantearlo").
  `computeGoal()` en `lib/calculations.ts` devuelve `bloqueado` +
  `motivoBloqueo` cuando el plan es demasiado agresivo (`esAgresivo`, ya
  existía) o cuando el objetivo calculado cae por debajo de un piso de
  seguridad nuevo (`MIN_SAFE_KCAL`: 1500 hombre / 1200 mujer — comer menos que
  eso de forma sostenida no es seguro, sin importar cuánto falte bajar). En
  ese caso, tanto `GoalCalculator.tsx` (edición rápida) como
  `GuidedGoalCalculator.tsx` (onboarding) muestran el motivo en rojo y **sacan
  el botón "Usar este objetivo"** en vez de dejar aplicarlo. Un plan razonable
  (ej. 5kg en 4 meses) sigue funcionando normal.
- **2026-09-10**: se encontró y arregló un bug de deriva — `RecipePlanner.tsx`
  en algún momento pasó a ser una versión más simple/curada (menos recetas,
  sin `dailyGoal`/`consumedKcal`) sin que `app/page.tsx` se actualizara, lo
  que rompía el build. Se le agregó la integración de `dailyGoal`/
  `consumedKcal` a esta versión actual (no se revirtió a la versión vieja más
  compleja, que parece haber sido reemplazada a propósito).
- **2026-09-10**: usuario pidió borrar todas las cuentas de Supabase Auth
  menos la suya (jgabrielrosa8@gmail.com), incluyendo el login, no solo los
  datos. Se le agregó la `service_role` key a `.env.local` (nunca se comitea,
  cubierto por `.gitignore`) para poder hacer esto con un script — pero antes
  de borrar nada se hizo un `auth.admin.listUsers()` de solo lectura, que
  mostró solo 2 cuentas totales: la del usuario y `flaviabravo61@gmail.com`
  (creada 10/09). Se le preguntó al usuario si esa segunda cuenta es también
  suya antes de borrar, dado que el nombre no parece un alias de prueba
  propio. El usuario dijo que ya la había borrado a mano, pero el listado de
  solo lectura mostró que seguía existiendo — no se borró nada sin
  confirmación explícita, queda pendiente que el usuario decida cómo seguir.
- **2026-09-10**: bug real — los modales "Cargar con IA", "Entrenamiento" y
  "Datos" en `app/page.tsx` no tenían `max-h-[calc(100vh-2rem)] overflow-y-auto`
  (solo lo tenía el de "Objetivo"), así que en pantallas chicas el contenido
  se salía de la pantalla sin poder scrollear — no se veía el botón de abajo.
  Se les agregó la misma clase que ya usaba el modal de Objetivo. Probado en
  un viewport de 375×600: antes el botón "Calcular con IA" quedaba fuera de
  vista (y=768 en una pantalla de 600px), después scrollea correctamente
  adentro del modal.
- **2026-09-10**: sugerencias de comida en `AiEntryForm` — bajadas de 12 a un
  máximo de 6, y ahora se retroalimentan con lo que el usuario realmente
  carga. Nuevo `lib/useMealHistory.ts` (localStorage) guarda cada texto de
  comida guardado y cuántas veces se repitió; una vez que algo se repite 2+
  veces, reemplaza a las sugerencias fijas de arranque (que van completando
  los lugares que sobran hasta llegar a 6). Es por dispositivo, no sincroniza
  entre cuentas — es un hábito personal, no un dato de la cuenta.
- **2026-09-10**: separación definitiva de "cargar comida" y "cargar
  entrenamiento". `components/AiEntryForm.tsx` tenía embebida una sección
  entera de "Actividad del día" (pasos, peso, entrenamiento, duración,
  "Guardar actividad") que duplicaba lo que ya hace `TrainingEntryForm.tsx`
  vía el botón "+ Entrenamiento". Se la sacó por completo: `AiEntryForm`
  ahora solo maneja alimentos (fecha, comida, texto/audio, sugerencias,
  ingredientes de inventario, calcular/guardar). El botón "🎙️ Grabar" se
  hizo más visible (antes era una píldora chica gris; ahora es un botón
  ancho, dorado, con ícono grande, arriba del textarea). Además, el modal
  "ai" en `app/page.tsx` ahora abre como hoja de pantalla completa en
  mobile (`fixed inset-0` sin bordes redondeados ni backdrop, con header
  fijo "Cargar comida" + botón Cerrar) y vuelve a ser la tarjeta centrada
  de siempre a partir de `sm:`. Verificado con Playwright a 375×667: sin
  la sección de entrenamiento el contenido ya entra sin necesitar scroll
  (scrollHeight ≈ clientHeight), y el flujo de "+ Entrenamiento" sigue
  funcionando sin cambios.
- **2026-09-10**: descuento automático de inventario + sugerencias
  resumidas, ambos usando la misma llamada a la IA que ya calculaba
  kcal/proteína (sin llamada extra). `app/api/parse-meal/route.ts` ahora le
  pide también un `"resumen"` (título corto de la comida, ej. "Yogur con
  mermelada de arándanos" en vez del párrafo completo con detalles de
  "lo hice con leche proteica, etc.") y un `"ingredientes"` (listado
  normalizado "cantidad unidad nombre" apto para descontar de la
  alacena). Se sacó el campo manual "Ingredientes usados del inventario"
  de `AiEntryForm.tsx` — al guardar la comida se descuenta solo, usando
  ese listado. `lib/useInventory.ts` → `consumeByText` ahora devuelve
  `{ consumed, missing }`; si algo del texto no está cargado en el
  inventario, se lo avisa en el mensaje de guardado ("Che, esto no lo
  tenías cargado en el inventario: banana. Cargalo en Compras y la
  próxima te lo descontamos solo.") en vez de fallar en silencio. De
  paso se corrigió un bug de regex en `parseInventoryText` que no
  reconocía la unidad "u" sin punto (`u\.` → `u\.?`), lo que hacía que
  el nombre del ingrediente saliera con un prefijo suelto ("u banana").
  El historial de sugerencias (`useMealHistory`) ahora guarda el
  `resumen` corto en vez del texto largo dictado, así las sugerencias
  futuras no repiten párrafos enteros. Probado con Playwright
  mockeando la respuesta de `/api/parse-meal`: con "huevo" cargado en
  inventario y "banana" no, tras guardar "2 huevos y una banana" el
  inventario de huevo bajó de 6 a 4, el mensaje avisó que "banana" no
  estaba cargada, y el historial guardó "Huevos con banana" (el resumen)
  en vez del texto tal cual se escribió.
- **2026-09-10**: bug real reportado con captura — en los campos Kcal/
  Proteína de `AiEntryForm.tsx` (los que aparecen tras "Calcular con
  IA"), si tipeabas un 0 al principio (ej. completar "80" escribiendo
  "0" antes para armar "0220"), el cero quedaba pegado en pantalla para
  siempre aunque el valor numérico ya fuera correcto. Es un bug conocido
  de React con inputs `type="number"` controlados: cuando el string
  tipeado parsea al mismo número que ya estaba en el state, React no
  vuelve a pisar el DOM (compara contra el último valor que él mismo
  puso, no contra lo que el navegador ya mutó), y el 0 de más queda
  ahí. Se agregó `normalizeNumberInput()` en `lib/inputLimits.ts`, que
  fuerza el string del input al valor numérico canónico apenas difiere,
  y se aplicó a los dos campos. Reproducido y confirmado arreglado con
  Playwright: escribir un 0 al inicio de "80" ya no dejaba "080"
  pegado, y se pudo seguir editando con normalidad.
- **2026-09-11**: nueva "memoria de comidas" (reemplaza a `useMealHistory`),
  a pedido del usuario tras preguntar por qué la IA le calculaba 80 kcal
  para un yogur casero que él sabe que tiene 110. `lib/useMealMemory.ts`
  guarda descripción + kcal/proteína EXACTOS (no solo el texto), y al
  escribir una comida nueva primero busca una coincidencia flexible por
  palabras compartidas (`similarity()`, umbral 0.6) antes de llamarla IA
  — si tenés 2+ palabras significativas en común con algo que ya
  guardaste, usa ese valor directo, sin gastar una llamada a la IA. Si
  el texto es muy corto (1 palabra significativa) exige coincidencia
  exacta para evitar falsos positivos. `AiEntryForm.tsx`: `handleCalc`
  ahora chequea la memoria primero (salvo que se fuerce recálculo), y
  hay un link "¿Cambió algo? Recalcular con IA" para pasar por alto la
  memoria cuando corresponda. Al guardar, `remember()` graba (o
  actualiza) el valor con el kcal/proteína que quedó en pantalla —
  si lo corregiste a mano, esa corrección pasa a ser el valor fijo de
  ahí en adelante. Nuevo `components/MealMemoryImport.tsx` (dentro del
  panel "Datos") permite importar un CSV con columnas descripcion/kcal/
  proteina_g para poblar la memoria en bloque — NO carga esos días como
  historial real de la app (eso se descartó a pedido explícito), solo
  alimenta la memoria de comidas. Cuando una descripción se repite en
  el CSV, se queda con el valor de la ocurrencia más reciente (no
  promedia). Probado con el CSV real del usuario (72 filas, 3 sin
  registro): importó 69, colapsó a 66 entradas únicas, y escribir "hoy
  comi tostadas con huevos y queso crema de nuevo" (frase distinta a la
  guardada) reconoció la comida y devolvió el valor guardado sin
  ninguna llamada a la IA; "Recalcular con IA" sí la forzó cuando se
  probó explícitamente.
- **2026-09-11**: bug real — `RecipePlanner.tsx` ("Planner de cocina") no
  usaba `Collapsible.tsx` como el resto de las secciones (Indicadores,
  Ranking, Herramientas, Tabla, Pasos, Compras), así que siempre
  arrancaba desplegado con todo el contenido a la vista (tipos de
  cocina, selector de comida, heladera, sugerencias) apenas se cargaba
  la página. Envuelto en `Collapsible` igual que las demás — arranca
  cerrado (`defaultOpen` es `false` por default) y muestra la misma
  cabecera con flecha y badge de "N sugerencias".
- **2026-09-11**: pedido grande — barra de pestañas arriba de todo
  (`components/TabBar.tsx`: Inicio / Macros / Actividad, estado
  `activeTab` en `page.tsx`). "Inicio" es exactamente la app de siempre,
  sin tocar nada. Las otras dos son paneles nuevos con su propia
  tarjeta "Hoy" + gráficos (Recharts, mismo estilo que `WeeklyChart`):
  - **Macros** (`components/MacrosTab.tsx`): esto requería agregar
    carbohidratos y grasas al modelo de datos, que antes solo tenía
    kcal/proteína por comida (`DayEntry.desC/desG/almC/almG/...`,
    opcionales para no romper registros viejos sin este dato — se leen
    con `|| 0`). `app/api/parse-meal/route.ts` ahora le pide a la IA
    también "carbs" y "fat" (debe ser consistente con las kcal:
    kcal ≈ prot×4 + carb×4 + grasa×9), y `AiEntryForm` tiene los inputs
    correspondientes. Nuevo `macroTargets()` en `lib/calculations.ts`:
    la proteína objetivo sigue siendo por peso corporal
    (`proteinTargetForWeight`), y lo que sobra del objetivo de kcal se
    reparte 50/50 entre carbohidratos y grasas (reparto flexible por
    default, no una dieta estricta). La pestaña muestra hoy vs objetivo
    por macro (barras de progreso), un donut del reparto de hoy, un
    stacked bar semanal de kcal por macro, y proteína diaria vs
    objetivo. `useMealMemory.ts` también guarda carbs/fat por comida
    ahora, así el match por memoria trae el macro completo, no solo
    kcal/proteína.
  - **Actividad** (`components/ActividadTab.tsx`): pasos, calorías
    quemadas entrenando y sueño, cada uno con su gráfico semanal (el de
    sueño con línea de referencia en 8hs). El sueño es un dato nuevo
    que no existía en la app (`DayEntry.suenoHoras`, opcional) — se
    carga a mano en `TrainingEntryForm.tsx` (ahora "Pasos, sueño y
    entrenamiento", mismo botón "+ Entrenamiento" de siempre, sin
    agregar un botón nuevo).
  - Supabase: nuevas columnas `des_c/des_g/alm_c/alm_g/mer_c/mer_g/
    cen_c/cen_g` (carbs/grasas por comida) y `sueno_horas` en `days` —
    `supabase/schema.sql` actualizado + migración
    `migration_2026-09-11_add_macros_sueno.sql` (falta que el usuario
    la corra en el SQL Editor). `app/api/data/route.ts` actualizado en
    ambas direcciones (`toDay`/`toDayRow`).
  - Probado con Playwright: cambio entre las 3 pestañas, carga de una
    comida con carbs/fat mockeados reflejada en la pestaña Macros
    (stat cards, donut, gráficos semanales), carga de horas de sueño
    reflejada en la pestaña Actividad, e Inicio confirmado sin cambios
    visuales. Un bug encontrado en el camino: el donut de Recharts se
    veía como una astilla fina en la captura porque quedó a mitad de
    su animación de entrada — se le puso `isAnimationActive={false}`.
- **2026-09-11**: planificador de la semana que viene
  (`components/WeekPlanner.tsx`, sección "Planificador · Semana que
  viene" en Inicio, debajo del Planner de cocina). Grilla de los 7 días
  siguientes × 4 comidas (28 casilleros) donde se elige una receta del
  mismo catálogo que ya usaba `RecipePlanner` — se sacó ese catálogo a
  `lib/recipes.ts` (antes vivía adentro de `RecipePlanner.tsx`) para
  que ambos componentes usen exactamente las mismas recetas/
  ingredientes sin duplicar nada. Con lo que se va eligiendo, se arma
  sola una "Lista de compras de la semana": suma los ingredientes de
  todas las recetas elegidas, resta lo que ya hay en el inventario
  (mismo matching por nombre/unidad que usa `useInventory`), y solo
  muestra lo que falta comprar (si el inventario ya cubre un
  ingrediente, no aparece en la lista). El plan se guarda en
  `Settings.weekPlan` (nuevo campo, sincroniza por Supabase como
  `weeklyWeights` — columna `week_plan jsonb` +
  `migration_2026-09-11b_add_week_plan.sql`), auto-guardado en cada
  elección (sin botón "Guardar" aparte, como `WeeklyWeight`). Probado
  con Playwright: con "pollo" parcial (100g de 300g que pide la receta)
  y "arroz" totalmente cubierto (200g de 80g) en el inventario, al
  elegir "Bowl de pollo con arroz y verduras" para un desayuno, la
  lista de compras mostró correctamente "200g pollo, 150g brocoli, 80g
  cebolla, 15ml salsa de soja" y NO mostró arroz (ya cubierto).
- **2026-09-11**: bug real reportado — las sugerencias de comida en
  `AiEntryForm` no correspondían a la comida seleccionada (aparecían
  cosas de cena bajo "Desayuno" y viceversa). Causa: `MealMemoryEntry`
  nunca guardaba a qué comida correspondía cada plato — sugería toda la
  memoria mezclada sin importar el segmento del día. Se agregó el
  campo `meal` (última comida en la que se registró ese plato) a
  `lib/useMealMemory.ts`, `AiEntryForm.tsx` ahora lo pasa al guardar
  (`remember(..., meal)`) y `mealSuggestions` filtra por
  `h.meal === meal` antes de completar con las sugerencias fijas de
  arranque — que también se separaron por comida (antes eran una sola
  lista genérica con cosas como "Asado con ensalada" que podían salir
  como sugerencia de desayuno). De paso, `importCsv` ahora también lee
  la columna "comida" del CSV (Desayuno/Almuerzo/Merienda/Cena) para
  taguear el segmento correcto al importar en bloque — los 66 registros
  ya importados antes de este fix no tienen esa columna leída, así que
  quedaron sin `meal` y no van a aparecer como sugerencia personalizada
  hasta reimportar el mismo CSV o volver a cargarlos a mano (lo cual ya
  los tagueará bien). Probado con Playwright: con una entrada de
  memoria tageada "des" y otra "cen", seleccionando Desayuno solo
  aparece la de desayuno (y viceversa al cambiar a Cena).
- **2026-09-11**: el Planificador de la semana pasó de ser una sección
  `Collapsible` que se desplegaba inline en medio de toda la página, a
  un modal dedicado (mismo patrón que "Cargar comida"/"+ Entrenamiento":
  hoja de pantalla completa en mobile, tarjeta centrada en desktop) —
  pedido explícito para que la carga de los 28 casilleros sea más
  cómoda, sin competir por espacio con el resto de las secciones de
  Inicio. `components/WeekPlanner.tsx` ya no importa `Collapsible`;
  ahora exporta también `getNextWeekDates()` y `countPlannedMeals()`
  como funciones sueltas para que `page.tsx` pueda mostrar el badge de
  "N comidas" en la tarjeta de entrada sin duplicar la lógica de qué
  cuenta como "la semana que viene". El selector de receta (modal
  anidado adentro del modal del planificador) subió a `z-[60]` para
  quedar siempre por encima. Probado con Playwright: la grilla ya no
  aparece en la página hasta tocar la tarjeta "Semana que viene", el
  modal se abre con sus 28 casilleros, el selector de receta anidado se
  ve correctamente por encima, y el contador de comidas elegidas se
  actualiza tanto en el modal como en la tarjeta de entrada al cerrar.
- **2026-09-11**: tres pedidos sobre el Planificador de la semana con
  la captura de "Desayuno · Lunes" mostrando recetas de almuerzo/cena.
  1. **Bug real**: `Recipe` no tenía ningún dato de para qué comida
     serv­ía, así que el selector mostraba el catálogo completo sin
     importar si elegías Desayuno o Cena. Se agregó `meals: MealKey[]`
     a cada receta en `lib/recipes.ts` (las 8 recetas viejas quedaron
     como `["alm","cen"]`, ninguna era apta para desayuno) y se sumaron
     4 recetas nuevas de desayuno/merienda con ingredientes reales
     ("Tostadas con huevo y palta", "Avena con banana y miel", "Yogur
     con granola y frutos rojos", "Panqueques de avena y banana"). El
     mismo filtro se aplicó también en `RecipePlanner.tsx` (tenía el
     mismo bug de fondo, aunque no se había reportado ahí todavía).
  2. El selector ahora también muestra "tu memoria" — las comidas
     personales guardadas (`useMealMemory`, ya tagueadas por comida
     desde el fix anterior) para ese segmento del día, no solo el
     catálogo fijo. Como esas no tienen ingredientes estructurados, se
     aclara que no suman a la lista de compras (y el mensaje de la
     lista de compras distingue ese caso de "ya tenés todo cubierto").
  3. Tope de 6 sugerencias en el selector (hasta 4 de memoria personal
     + catálogo hasta completar 6), mismo criterio que ya usa
     `AiEntryForm`.
  4. Cada día de la grilla ahora se auto-colapsa a un resumen de una
     línea ("Lunes 14 Sep · ✓") apenas se completan las 4 comidas, para
     poder seguir cargando los días siguientes sin scrollear entre
     casilleros ya llenos. Sigue siendo clickeable para volver a
     abrirlo y revisar/cambiar una elección.
  De paso se corrigió una inconsistencia que salió al probar esto: el
  contador "N comidas" del encabezado solo contaba las comidas con
  receta de catálogo (`selectedRecipes.length`), mientras que la
  tarjeta de entrada de `page.tsx` contaba TODOS los casilleros
  llenos (`countPlannedMeals`) — mostraban números distintos para el
  mismo plan. Ahora ambos usan `countPlannedMeals`, y el contador
  "solo catálogo" quedó reservado para decidir qué mensaje mostrar en
  la lista de compras. Probado con Playwright: desayuno con 5 comidas
  de memoria + 2 recetas de catálogo mostró exactamente 4 de memoria +
  2 de catálogo (6 total), sin nada de cena ni recetas de
  almuerzo/cena mezcladas; al completar las 4 comidas del lunes la fila
  se colapsó a "✓" y el contador general pasó a "4 comidas" en ambos
  lugares.
- **2026-09-11**: agregada sección "Tus comidas más comunes" dentro del
  Planificador de la semana, entre la grilla de 7 días y la lista de
  compras — pedido del usuario ("las comidas típicas que tengo
  guardado", aclarado después como "por segmento del día"). Muestra
  hasta 5 comidas de `useMealMemory` por cada Desayuno/Almuerzo/
  Merienda/Cena (las más repetidas primero, mismo orden que ya trae la
  memoria), solo de lectura por ahora — sirve como referencia rápida
  mientras se completa cada día, sin tener que abrir el selector de
  cada casillero para ver qué sueles comer. Si todavía no hay nada
  guardado para un segmento, muestra un aviso en vez de dejarlo vacío
  sin explicación.
- **2026-09-11**: "Comidas más comunes" pasó a ser su propia sección
  (`components/CommonMealsCard.tsx`, Collapsible nuevo entre "Planner
  de cocina" y el botón del Planificador) en vez de vivir adentro del
  modal del Planificador — pedido del usuario para verla separada. De
  paso se le agregó lo que pidió después: cada comida ahora muestra un
  punto de color según su densidad de proteína (`proteinDensity` +
  `proteinQualityTier` de `lib/calculations.ts`, el MISMO criterio y
  paleta que ya usa `RankingCard` para clasificar comidas — sage/bueno,
  gold/medio, rust/a mejorar — así no hay dos escalas de color distintas
  en la app para lo mismo), con una leyenda arriba explicando los
  umbrales. Probado con tres comidas de densidad claramente distinta
  (alta/media/baja proteína por caloría): cada una salió con el color
  esperado.
- **2026-09-11**: implementado el pedido de entrenamientos "súper
  completo" (rutinas + desglose de series + planificación), que había
  quedado anotado como pendiente el mismo día. Decisiones acordadas
  con el usuario antes de construir: series uniformes por ejercicio
  (no serie por serie distinta) y rutinas reusables asignadas a días
  fijos de la semana (no elegir ejercicios sueltos cada semana, como
  hace el Planificador de comidas).
  - Modelo de datos nuevo en `lib/types.ts`: `ExerciseEntry` (nombre +
    series + repeticiones + peso opcional), `Routine` (plantilla
    reusable con id/nombre/ejercicios), `TrainingSchedule` (día de la
    semana → id de rutina, se repite todas las semanas hasta que se
    cambie), `Weekday`/`WEEKDAYS`/`WEEKDAY_LABELS`. `DayEntry` suma
    `ejercicios?: ExerciseEntry[]` (lo que REALMENTE se entrenó ese
    día — separado de `entrenamientos`, que sigue siendo solo
    intensidad+minutos para el cálculo de calorías, sin tocar). Nuevo
    `totalVolume()` y `weekdayOf()` en `lib/calculations.ts`.
  - `components/RoutineManager.tsx` (nuevo, dentro de la pestaña
    Actividad): "Tu rutina semanal" (7 días, tocás uno y elegís qué
    rutina le toca o "Descanso") + "Tus rutinas" (crear/editar/
    eliminar rutinas, cada una con una lista dinámica de ejercicios
    con series/repeticiones/peso).
  - `components/ExerciseLogCard.tsx` (nuevo): "Ejercicios de hoy" — si
    hay una rutina asignada al día de la semana de hoy y todavía no
    guardaste nada, se precarga sola (avisando de dónde salió),
    editable antes de guardar, con el volumen total (series×reps×peso)
    a la vista. **Bug real encontrado en mi propia prueba**: al crear
    y asignar una rutina en la misma visita, la precarga no aparecía
    porque el estado inicial del componente se calculaba una sola vez
    al montar (`useState(() => ...)`), antes de que existiera la
    rutina. Se agregó un `useEffect` que reacciona cuando cambia la
    rutina programada Y todavía no hay nada guardado para hoy — así
    no compite con ediciones en curso del usuario, pero sí reacciona
    a asignar la rutina recién en el momento.
  - `ActividadTab.tsx` suma un cuarto gráfico semanal ("Volumen
    entrenado") además de pasos/calorías/sueño.
  - Supabase: `days.ejercicios jsonb`, `user_settings.routines jsonb`,
    `user_settings.training_schedule jsonb` — schema.sql actualizado +
    migración `migration_2026-09-11c_add_routines.sql` (falta que el
    usuario la corra). `app/api/data/route.ts` actualizado en ambas
    direcciones.
  - Probado de punta a punta con Playwright: crear la rutina "Día A:
    Piernas" (Sentadilla 4x8x80kg), asignarla a hoy, confirmar que se
    precargó sola en "Ejercicios de hoy" con el aviso correspondiente,
    guardar, y verificar que el volumen (2560kg) apareció en el
    gráfico semanal del día correcto — y que routines/trainingSchedule/
    ejercicios quedaron bien guardados en `localStorage`.
- **2026-09-11**: reorganización grande pedida por el usuario ("cómo
  dividir mejor la app"), en tres partes que se hicieron todas juntas:
  1. **Pestaña "Comidas" nueva** (`components/ComidasTab.tsx`,
     `TabBar.tsx` pasa de 3 a 4 pestañas: Inicio/Comidas/Macros/
     Actividad). Agrupa el Planner de cocina, Comidas más comunes y el
     botón del Planificador de la semana — antes vivían mezclados en
     la segunda columna de Inicio. Inicio queda solo con estadísticas
     (Hoy, Semana, Ranking, Herramientas, Tabla, Pasos, Compras), tal
     como pidió el usuario ("esa pantalla está bien, no la toquemos").
  2. **Macros más completo**: se agregó fibra como cuarto macro
     (`DayEntry.desF/almF/merF/cenF`, la IA de `/api/parse-meal` ahora
     también estima "fiber", objetivo genérico de ~14g cada 1000kcal
     de `macroTargets()` — no depende del peso como la proteína) y
     "diversidad de grupos alimenticios": nuevo `lib/foodGroups.ts`
     clasifica ingredientes por palabras clave (proteína animal/
     vegetal, lácteo, verdura, fruta, cereal, grasa) SIN llamar de
     nuevo a la IA — reutiliza el mismo `ingredientes` que ya devuelve
     `/api/parse-meal` para el inventario, parseado con
     `parseInventoryText` (ya existía en `useInventory.ts`) y guardado
     como `DayEntry.alimentos: string[]` al guardar una comida en
     `AiEntryForm`. `MacrosTab` suma un 4to stat (Fibra), un gráfico
     semanal de fibra, y una sección "Diversidad de esta semana" que
     lista cuántos alimentos distintos de cada grupo se comieron.
  3. **Tips motivacionales** (`lib/tips.ts` + `components/TipPopup.tsx`):
     un cartel descartable arriba de todo, que aparece como máximo una
     vez cada 2 días (throttle por `localStorage`, no por cuenta) al
     entrar a la app — pedido explícito: "que no sean tediosas". Reglas
     simples sobre los datos reales de la semana (proteína vs
     objetivo, tendencia de peso según el modo de objetivo, promedio
     de sueño, consistencia de entrenamiento, diversidad de verduras),
     sin IA en vivo. Prioriza felicitaciones sobre sugerencias cuando
     hay algo para festejar, con tono motivacional ("Cumpliste tu
     objetivo de proteína 💪", "Seguís bajando de peso 🙌") — y una
     sugerencia suave (no un reto) cuando algo se puede mejorar.
  Probado de punta a punta con Playwright: las 4 pestañas están, los
  3 componentes movidos ya no aparecen en Inicio y sí en Comidas, una
  comida cargada con fibra=8 y ingredientes "pollo, tomate, brocoli,
  cebolla" (mockeados) apareció correctamente en el stat de Fibra y en
  Diversidad (pollo bajo "Proteínas animales", tomate/brócoli/cebolla
  bajo "Verduras"), y el tip de "Cumpliste tu objetivo de proteína"
  apareció con datos reales, se pudo cerrar, y no volvió a aparecer en
  un reload inmediato (throttle funcionando).
- **2026-09-11**: bug real de mobile — al tocar cualquier ícono "?"
  (`InfoHint.tsx`), el popup se posicionaba `absolute` anclado al
  propio ícono (`left:0; top:100%`), un elemento inline chiquito que
  puede vivir en cualquier posición horizontal de la pantalla (al lado
  de un título, adentro de una tarjeta angosta, cerca del borde
  derecho). En mobile esto podía desbordar el viewport y generaba el
  salto/movimiento de pantalla que reportó el usuario. Se cambió a un
  popup `fixed` respecto a toda la pantalla (como una hoja que aparece
  abajo, centrada en desktop a partir de `sm:`), totalmente
  desacoplado de dónde esté el ícono — ya no puede desbordar ni
  empujar nada del layout, sin importar en qué parte de la página se
  use. Probado con Playwright: `window.scrollY` no cambia al abrir el
  popup (ni en un ícono arriba de todo ni en uno dentro de una sección
  colapsable más abajo), y `body.scrollWidth` sigue igual al ancho del
  viewport (sin overflow horizontal).
- **2026-09-11**: dos bugs reales en `DataImport.tsx` (panel "Datos").
  1. El modal se cerraba solo (`setPanel(null)`) apenas terminaba de
     importar un respaldo, así que el cartel de confirmación
     ("N días importados ✓") nunca llegaba a verse — se cerraba en el
     mismo render en el que aparecía. Se sacó ese auto-cierre; ahora el
     usuario ve la confirmación y cierra el panel él mismo cuando
     quiere.
  2. El botón "Datos (importar / exportar respaldo)" prometía exportar
     pero no existía ningún botón de exportar — solo estaba el de
     importar. Se agregó "Exportar respaldo", que descarga un
     `registro_respaldo_<fecha>.json` con el mismo formato
     `{ days, settings }` que ya acepta el import (compatible con
     importar ese mismo archivo después, o pasárselo a otra cuenta/
     dispositivo). Probado con Playwright: tras importar un backup de
     prueba el panel queda abierto con "1 días importados ✓" visible;
     el botón de exportar dispara una descarga real cuyo contenido
     (parseado de vuelta) tiene los mismos días y el settings completo.
- **2026-09-11**: tres bugs reales reportados por el usuario tras
  probar a mano lo que mi barrido automático de QA no detectó (solo
  chequeaba que lo que ya existía funcionara, no si el RESULTADO se
  veía bien).
  1. **Bug real de raíz** en `WeeklyChart.tsx` ("Indicadores"): las
     líneas de "Objetivo diario" y "Gasto" no se veían nunca. La causa
     real: Recharts ignora en silencio los `<Line>` que se meten
     adentro de un `<BarChart>` — esa combinación (barras + línea)
     solo se soporta con `<ComposedChart>`. Se cambió el contenedor;
     confirmado con el DOM que antes había 0 `<path>` de línea y ahora
     hay 2. De paso: el eje Y no consideraba los valores de las líneas
     al calcular su rango, así que aunque las líneas ya renderizaran
     podían quedar recortadas por arriba — se agregó un dominio
     explícito que contempla barras y líneas. También se sacaron dos
     `ReferenceLine` redundantes (mismo color que las líneas de datos,
     tapándolas) y se le puso un color distinto a cada línea (antes
     "Gasto" compartía el mismo verde que la barra de Desayuno, y
     "Objetivo" el mismo dorado que la de Almuerzo — se camuflaban).
     Se agregó a la leyenda debajo del gráfico.
  2. Al tocar/tapear cualquier barra de cualquier gráfico (Recharts
     `<Tooltip>` sin `cursor` configurado), aparecía el resaltado por
     default: un rectángulo gris claro semitransparente, horrible
     sobre el fondo oscuro de la app. Se le puso
     `cursor={{ fill: "rgba(201,162,39,0.10)" }}` (un dorado sutil) a
     los `Tooltip` de `WeeklyChart.tsx`, `MacrosTab.tsx` (3 gráficos)
     y `ActividadTab.tsx` (el `WeekBarChart` compartido de los 4
     gráficos de esa pestaña) — el mismo bug estaba en los 7 lugares.
  3. El modal de intensidad de entrenamiento en `Ledger.tsx` (tocar el
     círculo de color de un día en "Tabla de la semana") dejaba elegir
     leve/moderado/exigente/al fallo pero no la duración — siempre
     guardaba con los minutos que ya hubiera o 60 por default, a
     diferencia de `TrainingEntryForm.tsx` que sí deja editarla. Se
     agregó un input de "Duración (min)" al modal (con el mismo límite
     de dígitos y ayuda contextual que ya se usa en el resto de la
     app), y la estimación de kcal por intensidad dentro del modal
     ahora recalcula en vivo con el valor que se esté escribiendo, no
     con el que ya estaba guardado.
  Probado con Playwright: el DOM ahora tiene 2 `path` de línea con los
  colores correctos; el cursor del tooltip usa el dorado sutil (no
  gris); el modal de Ledger guarda el minutaje editado (90 en vez del
  valor previo) junto con la intensidad elegida.
- **2026-09-12**: comidas ya cargadas ahora se pueden editar/borrar por
  alimento, en vez de quedar como un solo total opaco por comida. El
  usuario reportó que cargar de más/de menos una comida ya guardada no
  se podía corregir, y pidió que el desglose de una comida (ej. "Cena")
  se guarde separado en sus alimentos (milanesa, puré, ensalada) en vez
  de un único número.
  - Nuevo tipo `MealItem` (`lib/types.ts`) y campos `desItems/almItems/
    merItems/cenItems` en `DayEntry`. Nuevas funciones en
    `lib/calculations.ts`: `getMealItems()` (si no hay items cargados
    todavía, sintetiza uno solo "Comida cargada" a partir del total
    viejo — así los datos históricos también quedan editables sin
    migrarlos a mano), `sumMealItems()` y `applyMealItems()` (guarda
    los items y recalcula los 5 totales de la comida a partir de ellos,
    single source of truth).
  - `/api/parse-meal`: el prompt a la IA ahora pide también un array
    `items` (cada alimento/plato con su propio kcal/proteína/carbos/
    grasas/fibra, sumando exacto al total) — desglose 100% automático,
    sin que el usuario tenga que separar nada a mano.
  - `AiEntryForm.tsx`: al guardar, arma los `MealItem[]` a partir de la
    respuesta de la IA (o de la memoria personal, como un solo item) y
    los agrega a los que ya hubiera esa comida, en vez de sumar
    directamente a los 5 campos agregados.
  - Nuevo componente `TodayMealsBreakdown.tsx`, dentro de "Hoy" en
    Inicio: lista cada comida de hoy desglosada en sus alimentos, cada
    uno con kcal/proteína editables y un botón × para borrarlo — al
    cambiar algo, se recalculan solos los totales de "Hoy" (barra de
    kcal, proteína, etc).
  - Agregada columna `des_items/alm_items/mer_items/cen_items jsonb` a
    `supabase/schema.sql` + migración nueva
    `migration_2026-09-12_add_meal_items.sql` (falta correrla en
    Supabase) + mapeo bidireccional en `app/api/data/route.ts`.
  - Encontrado y corregido de paso: `useRecipeAsMeal` en `page.tsx` (usar
    una receta desde "Comidas") todavía sumaba directo a los 5 campos
    agregados de la comida sin tocar los items — con el nuevo sistema
    eso hubiera desincronizado el total mostrado del detalle
    itemizado (o directamente lo hubiera "borrado" en cuanto se editara
    cualquier otro item de esa comida, porque el total se recalcula
    como suma de items). Ahora también agrega la receta como un
    `MealItem` más.
  Probado con Playwright mockeando `/api/parse-meal`: una comida con 3
  items (milanesa/puré/ensalada) se guarda desglosada, el total de "Hoy"
  coincide con la suma; borrar un item recalcula el total en vivo (640
  → 580 kcal, 40g → 38g proteína) sin errores de consola. Confirmado
  también que una comida vieja sin `items` (solo `cenK/cenP/...`)
  aparece como un item editable "Comida cargada" y que editarlo
  actualiza bien el total de la comida — la corrección central que
  pidió el usuario.
- **2026-09-12**: usuario reportó que después de todo lo anterior
  "no puedo editar la comida cargada" — no veía ninguna opción. La
  causa: la sección nueva ("Detalle de comidas") arranca colapsada por
  `Collapsible`, y su título no dejaba claro que ahí adentro se podía
  editar. Se cambió `defaultOpen` a `true` (se abre sola, ya que solo
  aparece cuando hay algo para editar) y se renombró el título a
  "Editar comidas de hoy" para que la opción de edición sea obvia sin
  tener que tocar nada primero.
- **2026-09-12**: a pedido del usuario, el tooltip del gráfico semanal
  ("Indicadores") ahora también muestra, debajo del desglose de kcal
  por comida, los pasos del día, el entrenamiento (tipo e intensidad +
  minutos, o "No entrenó") y el déficit/superávit de ese día — antes
  solo mostraba las kcal de cada comida y las líneas de objetivo/gasto.
  Se reemplazó el `Tooltip` default de Recharts por un `content`
  custom (`ChartTooltip` en `WeeklyChart.tsx`) que lee `pasos`,
  `sessions` (vía `getTrainingSessions()`) y `deficit` (vía
  `dayDeficit()`, misma función que ya usa `Ledger.tsx`) agregados a
  los datos de cada día de la semana. Probado con Playwright: al pasar
  el mouse sobre una barra se ve "Pasos: 3.000", "Moderado · 45 min" y
  "Déficit: 1.397 kcal" con los colores correctos, sin errores de
  consola.
- **2026-09-12**: rediseño grande a pedido del usuario — look "más
  saludable" (verde y blancos), tipografía más redonda, 3 temas, menos
  texto suelto, reorganización de Inicio/solapas, y sueño separado del
  entrenamiento. Se hizo en varias piezas:
  1. **Sistema de temas (claro / oscuro / alto contraste)**: todos los
     colores estructurales (`bg/surface/surfaceAlt/text/textMuted/
     border` + `gold` como acento, ahora verde en vez de dorado, y
     `rust`/`sage`) pasaron de hex fijos en `tailwind.config.ts` a
     variables CSS (`rgb(var(--color-x) / <alpha-value>)`), definidas
     por tema en `app/globals.css` bajo `[data-theme="oscuro|claro|
     alto-contraste"]`. Un `useEffect` en `page.tsx` aplica
     `document.documentElement.dataset.theme = settings.theme` en cada
     carga. Los colores "semánticos" fijos que el usuario pidió NO
     tocar (rojo/verde/amarillo/azul de intensidad de entreno en
     `INTENSITY_STYLES`, y los colores categóricos de los gráficos de
     macros/comidas/sueño) se dejaron como estaban — solo se
     reemplazaron los usos sueltos del dorado viejo (`#C9A227`) que
     quedaban huérfanos tras el cambio de acento.
  2. **Tipografía redonda**: `Fraunces` (serif) → `Quicksand` para
     títulos, `Inter`/`JetBrains Mono` → `Nunito` para texto y
     labels — se ve menos "de computadora", más orgánico.
  3. **Botones con estilos hardcodeados → clases de Tailwind**: ~15
     botones/tarjetas usaban `style={{background:"#C9A227",
     color:"#1C1B18"}}` inline (no reaccionaban al tema). Se
     convirtieron a `className="bg-gold text-bg"` (y el equivalente con
     `sage`) — el truco es que `text-bg` da automáticamente el
     contraste correcto en los 3 temas porque `bg` es oscuro en oscuro
     y claro en claro/alto-contraste.
  4. **Navbar/menú de cuenta**: `AuthPanel.tsx` logueado pasó de ser una
     tarjeta grande a una barra angosta (email + avatar) con un menú
     desplegable (Preferencias / Cerrar sesión) — pensado como el lugar
     donde se van a ir agregando más opciones de cuenta a futuro
     (contraseña, etc., todavía no implementado).
  5. **Preferencias** (`components/Preferences.tsx`, nuevo): elegir
     tema, y prender/apagar qué solapas de arriba se muestran además de
     Inicio (que siempre está fija) — `Settings.theme` y
     `Settings.enabledTabs`, sincronizados a Supabase
     (`migration_2026-09-12b_add_theme_tabs.sql`, **falta correrla**).
     `TabBar.tsx` ahora filtra por `enabledTabs`, y si la solapa activa
     se deshabilita, `page.tsx` vuelve sola a Inicio. Se renombró la
     solapa "Actividad" a "Entrenamientos" (el id interno sigue siendo
     `actividad` para no tocar el resto del código).
  6. **Inicio más liviano**: a pedido del usuario, Inicio ahora tiene
     solo Hoy (sin cambios), Editar comidas de hoy, Semana (peso +
     Indicadores + gráfico) y Herramientas. Se sacaron de ahí: Ranking
     de días y Tabla de la semana (→ ahora dentro de Macros), Pasos de
     la semana editable (→ ahora dentro de Entrenamientos) y Compras/
     Ticket (→ ahora dentro de Comidas).
  7. **Sueño separado del entrenamiento**: el usuario reportó que cargar
     un entrenamiento le preguntaba también por el sueño, y quería que
     fueran cosas separadas. Se sacó `suenoHoras` de
     `TrainingEntryForm.tsx` y se creó `SleepEntryForm.tsx` con su
     propio botón "+ Sueño" en Entrenamientos (panel nuevo `"sueno"` en
     `page.tsx`).
  8. **Scroll interno de "Indicadores"**: `SummaryCards` ya tenía el
     mismo bug que `RankingCard` había resuelto antes — el
     `Collapsible` recortaba el contenido a `max-h-[60vh]
     overflow-y-auto` en vez de dejar que la página scrollee entera. Se
     agregó `scrollable={false}`, igual que `RankingCard`.
  9. Un pase liviano de "menos texto": el botón "Datos (importar /
     exportar respaldo)" pasó a decir solo "Datos" (la explicación ya
     está en el ícono de ayuda de "Herramientas"). Un pase más
     exhaustivo de mover texto suelto a los íconos "?" queda pendiente
     si el usuario lo pide específicamente.
  Verificado con Playwright, capturando pantallas en los 3 temas
  (oscuro/claro/alto-contraste) y en las 4 solapas: sin errores de
  consola, "Ranking"/"Tabla de la semana" aparecen en Macros, "Pasos de
  la semana" y "+ Sueño" en Entrenamientos, "Ticket / foto" en Comidas,
  el toggle de solapas en Preferencias oculta/muestra Macros y
  Entrenamientos correctamente, y los 3 temas se ven coherentes (probado
  cambiando `settings.theme` directamente ya que el menú de cuenta
  necesita sesión real de Supabase, no disponible en el entorno de
  testeo local). `npm run build` limpio antes y después de los cambios.
- **2026-09-12**: ajustes al menú de cuenta y a Preferencias, a pedido
  del usuario tras ver el rediseño anterior.
  - `AuthPanel.tsx`: la barra de cuenta logueada pasó de ser
    semi-transparente a una barra sólida (`bg-surface`, con borde
    inferior), muestra el **nombre** de la cuenta vinculada
    (`user_metadata.full_name`/`name`, que Google sí completa) en vez
    del email — si no hay nombre disponible (login por magic link, que
    no tiene metadata), cae al email como antes. El botón que abre el
    menú pasó de un círculo con la inicial a un ícono de engranaje
    (⚙), que abre el mismo menú de siempre (Preferencias / Cerrar
    sesión). No se agregó opción de contraseña, a pedido explícito del
    usuario ("no pongamos la contraseña").
  - `Preferences.tsx`: se agregó una tercera sección, "Herramientas",
    con los mismos 3 accesos que antes vivían en la tarjeta
    "Herramientas" de Inicio (Objetivo, Cargar con IA, Datos) — ahora
    reciben `onOpenCalc/onOpenAI/onOpenDatos` como props y abren los
    mismos paneles de siempre desde adentro de Preferencias.
  - `page.tsx`: se sacó la tarjeta "Herramientas" de Inicio (ya no
    hace falta, vive en Preferencias). Como el layout de Inicio en
    desktop era de 2 columnas (`lg:grid-cols-[1.3fr_1fr]`) y la
    columna derecha solo tenía esa tarjeta, se simplificó a una sola
    columna centrada (`mx-auto max-w-lg`) para no dejar una columna
    vacía.
  Probado con Playwright: como el menú de cuenta necesita sesión real
  de Supabase (no disponible en local), se forzó temporalmente el
  estado de `AuthPanel` en el archivo (revertido después de la
  captura, no quedó en el código) para verificar la barra sólida, el
  nombre "Gabriel Rosa", el ícono de engranaje, el menú desplegable, y
  que "Cargar con IA" desde adentro de Preferencias abre el mismo modal
  de siempre — todo sin errores de consola. `npm run build` limpio.
- **2026-09-12**: rediseño del tema "Alto contraste" a pedido del
  usuario — la versión anterior era clara (fondo blanco, verde muy
  oscuro), y lo que en realidad quería era fondo **negro** con texto e
  íconos en colores **flúor** (verde, celeste, naranja), sin relación
  con el verde apagado del tema oscuro normal. Se reescribió el bloque
  `[data-theme="alto-contraste"]` en `app/globals.css`: `bg`/`surface`
  ahora son negro puro (las tarjetas se distinguen solo por el borde,
  no por un fondo más claro — más "alto contraste" real), `accent`
  pasó a verde neón (`#39FF14`), `sage` a celeste neón (`#00E5FF`) y
  `rust` a naranja neón (`#FF6B00`); `text` blanco puro. No se tocaron
  los colores de intensidad de entreno (`INTENSITY_STYLES` en
  `lib/types.ts`) ni los colores categóricos de los gráficos de
  comidas/macros — siguen siendo los mismos en los 3 temas, como pidió
  el usuario desde el principio, y ya se ven bien vívidos por sí solos
  contra el negro. Verificado con Playwright (`settings.theme =
  "alto-contraste"`): fondo negro, botones y textos en verde/celeste/
  naranja bien saturados en Inicio, Macros y Entrenamientos, sin
  errores de consola. `npm run build` limpio.
- **2026-09-12**: el usuario aclaró que lo que quería con "alto
  contraste" era en realidad un tema **neón** distinto — no un tema
  claro/oscuro más con acentos flúor, sino que la base (fondos,
  tarjetas y botones) quede en negro y gris puro, y el color viva
  solo en el detalle (letras, bordes, íconos, puntos de gráfico) con
  un efecto de luz de neón real, no relleno sólido. Cambios:
  - Renombrado el tema de `"alto-contraste"` a `"neon"` en todo el
    código (`ThemeMode` en `lib/types.ts`, el selector `[data-theme]`
    en `globals.css`, el valor/label en `Preferences.tsx` → "Neón").
  - Paleta: fondo casi negro (`8 8 9`), verde neón de acento
    (`#39FF5A`), amarillo neón (`#FFE000`) y rosa neón (`#FF2D95`) —
    los 3 colores que pidió explícitamente ("amarillo brillante,
    rosaditos, verdes").
  - **Los botones "sólidos"** (`bg-gold text-bg` / `bg-sage text-bg`,
    usados en casi todos los CTA de la app) se invierten SOLO en este
    tema vía `[data-theme="neon"] .bg-gold.text-bg { ... }`: en vez de
    rellenarse del color de acento, quedan con fondo gris oscuro
    (`surface-alt`) y el borde + la letra en el color, con
    `text-shadow`/`box-shadow` para el efecto de resplandor — se
    aprovechó que Tailwind ya componía esas dos clases juntas en cada
    botón, así no hizo falta tocar ningún componente.
  - Cualquier texto con `text-gold`/`text-sage`/`text-rust` (números,
    títulos, eyebrows) también tira su propio resplandor en este tema.
  - Los puntos y líneas de los gráficos (Recharts) tienen un halo
    blanco suave (`filter: drop-shadow`) para que se vean "prendidos".
  - Sin tocar `INTENSITY_STYLES` (colores de entreno) ni los colores
    categóricos de gráficos de comidas/macros, como en los cambios de
    tema anteriores.
  Verificado con Playwright (`settings.theme = "neon"`): fondo negro
  real en Inicio/Macros, botones "+ Cargar comida"/"+ Entrenamiento"/
  "Cargar peso semanal" con fondo oscuro y borde+letra brillando en
  verde/rosa, número "1.300" (restantes) y "Pendiente" con resplandor
  rosa/amarillo, sin errores de consola. `npm run build` limpio.
- **2026-09-12**: tamaño de letra configurable + arreglo de accesibilidad,
  a pedido del usuario tras contar que a su suegra no le entraba a
  leer la app.
  - **Nuevo:** `Settings.fontSize` (`"chico" | "mediano" | "grande"`,
    en `lib/types.ts`, con `FONT_SIZE_OPTIONS` compartido). Se aplica
    con `document.documentElement.setAttribute("data-font-size", ...)`
    en `page.tsx`, igual que el tema.
  - Como casi todos los tamaños de letra de la app son px fijos
    (`text-[10px]`, `text-[11px]`, etc., no la escala en rem de
    Tailwind), no alcanzaba con escalar el `font-size` del `html` —
    se armó una tabla de overrides en `globals.css` por cada valor de
    px puntual usado en el código (`html[data-font-size="mediano"]
    .text-\[Npx\] { font-size: ...}`, ídem para "grande"), más el
    `font-size` del html para que las clases que sí son rem
    (text-sm/lg/xl/etc.) escalen solas.
  - **Selector nuevo en Preferencias**: sección "Tamaño de letra" con
    Chico/Mediano/Grande, cada opción mostrando su propio label en ese
    tamaño como vista previa.
  - **Selector también en el onboarding**: se agregó un paso nuevo,
    el primero de todos ("Paso 1 de 3"), antes de "Definí tu
    objetivo" — para que alguien que recién entra (como la suegra del
    usuario) pueda agrandar la letra ANTES de tener que leer el resto
    del alta. Se aplica en vivo (no hay que terminar el onboarding
    para que tome efecto).
  - `InfoHint.tsx`: el ícono "?" pasó de 9px a 11px (con el botón un
    poco más grande, de 4x4 a 5x5) y el texto del popup de ayuda de
    11px a 13px — el usuario señaló específicamente que "los botones
    de ayuda" tenían la letra muy chica.
  - **Dureza de PWA**: agregado `maximumScale: 1, userScalable: false`
    al `viewport` de `app/layout.tsx` (bloquea el pinch-zoom) y
    `overscroll-behavior: none` en `html, body` (bloquea el rebote
    elástico al hacer scroll de más) — a pedido explícito de que "no
    se pueda scrollear, hacer zoom y esas cosas".
  - **Bug real encontrado en la revisión que pidió el usuario**: al
    correr el barrido completo (3 temas × 3 tamaños de letra, sin
    overflow horizontal como criterio automático) apareció overflow
    horizontal en TODAS las combinaciones. La causa no tenía nada que
    ver con el tamaño de letra: la solapa "Entrenamientos" (renombrada
    de "Actividad" en un cambio anterior de esta sesión) es una sola
    palabra que no puede partirse en dos líneas, y a 390px de ancho no
    entraba en su cuarto del `TabBar` — un bug que ya existía desde
    ese cambio anterior y que ningún chequeo visual había detectado
    hasta este barrido automático. Arreglado en `TabBar.tsx`: label
    acortado a "Entreno", agregado `min-w-0 truncate` como red de
    seguridad, y la solapa de arriba pasó a tener su propia escala de
    tamaño de letra más conservadora (clase `.tabbar-label` en
    `globals.css`, tope de 11.5px en "grande" en vez de seguir la
    escala general de 15px) — de otro modo, justo en el tamaño
    "grande" (el que más le importa a alguien con dificultad para
    leer), las 4 solapas se recortaban con "…".
  - Nueva migración `migration_2026-09-12c_add_font_size.sql`
    (columna `font_size` en `user_settings`, **falta correrla**) +
    mapeo en `app/api/data/route.ts`.
  Verificado con Playwright: barrido de 3 temas × 3 tamaños de letra
  (24 chequeos) — sin overflow horizontal, sin errores de consola, el
  `font-size` calculado escala correctamente en cada paso (9px → 10.5px
  → 12.5px en un elemento de muestra), el meta viewport bloquea el
  zoom, el onboarding muestra el paso de tamaño de letra primero y lo
  aplica en vivo, y el popup de ayuda (InfoHint) abre con el tamaño
  nuevo y cierra al tocar afuera sin mover el scroll de la página.
  `npm run build` limpio.
- **2026-09-12**: el usuario reportó "no me deja scrollear en la app"
  en su celular después del cambio anterior. Revertido de inmediato lo
  que había agregado para "bloquear zoom y scroll de más": `viewport`
  en `app/layout.tsx` (sacados `maximumScale: 1` y `userScalable:
  false` — probablemente el causante, hay quirks conocidos donde
  `user-scalable=no` rompe el scroll normal en algunos navegadores
  mobile) y `overscroll-behavior: none` en `html, body` de
  `globals.css` (también sospechoso al combinarse con el `TabBar`
  `sticky`). No se pudo reproducir el bug en el entorno de testeo
  local (Playwright/Chromium headless no tiene los mismos quirks de
  Safari/Chrome mobile), así que se optó por revertir ambos cambios en
  vez de intentar aislar cuál era el culpable — recuperar el scroll es
  más importante que bloquear el pinch-zoom. `npm run build` limpio.
- **2026-09-12**: el usuario reportó que en el tema Neón no todo el
  texto brillaba — el texto muted/gris (labels, valores secundarios)
  quedaba plano, y pidió que directamente nunca sea gris, aunque sea
  blanco o celeste. Dos cambios en `globals.css`:
  1. `--color-text-muted` del tema neón pasó de un gris neutro
     (150 150 155) a un celeste-blanco (175 230 240) — deja de ser
     gris aunque sea el tono "apagado" del tema.
  2. Se agregó `[data-theme="neon"] body { text-shadow: ... }` con un
     resplandor blanco/celeste suave heredado por defecto por TODO el
     texto (el `text-shadow` es una propiedad que se hereda en CSS),
     en vez de depender de que cada texto tuviera puntualmente una
     clase `text-gold`/`text-sage`/`text-rust` para brillar. Los
     textos que sí tienen esas clases de color siguen con su propio
     resplandor más fuerte (esa declaración explícita gana sobre la
     heredada), así que los botones y valores destacados se ven igual
     que antes — lo que cambia es que ahora TODO lo demás (labels,
     números secundarios, texto de ayuda) también brilla en vez de
     quedar plano.
  Verificado con Playwright: captura de Inicio en Neón muestra
  "RESTANTES"/"PROTEÍNA"/"PASOS"/"DESAYUNO"/"KCAL" y los valores
  numéricos con un brillo blanco-celeste visible, sin ningún texto
  gris plano, sin errores de consola. `npm run build` limpio.
- **2026-09-12**: el usuario mandó una captura señalando dos cosas que
  seguían sin ser "neón" en ese tema: el botón de intensidad de
  entreno (ej. "● MODERADO") y las barras del gráfico semanal —
  ambos con relleno sólido de color en vez de brillar como el resto.
  - **Botón de intensidad**: usa colores inline de
    `INTENSITY_STYLES` (mismos en los 3 temas, a pedido del usuario en
    su momento — eso no cambió), así que no se podía tocar con una
    clase normal. Se le agregó una clase `intensity-${intensidad}` a
    cada lugar donde se renderiza (`TodayCard.tsx`, `ActividadTab.tsx`,
    `TrainingEntryForm.tsx`) y se agregaron 5 reglas en
    `globals.css` (`.intensity-leve/moderado/exigente/fallo/ninguno`)
    con `!important` (necesario para ganarle a un `style` inline) que
    invierten el botón igual que los demás: fondo oscuro, borde y
    letra prendidos en un color propio por intensidad — celeste
    (leve), naranja (moderado), amarillo (exigente), violeta (al
    fallo) — así cada intensidad se sigue distinguiendo pero ahora
    brilla en vez de ser un rectángulo de color plano.
  - **Gráfico semanal**: en `WeeklyChart.tsx` se le agregó `className`
    a las barras de Desayuno/Merienda/Cena y a la línea de "Gasto"
    (`chart-des/chart-mer/chart-cen/chart-gasto`), con las mismas
    reglas neón en `globals.css` (celeste/violeta/naranja/celeste)
    aplicadas tanto al `fill`/`stroke` del gráfico (atributo SVG, le
    gana a cualquier CSS sin necesitar `!important`) como al
    `background-color` de los puntitos de la leyenda de abajo (ahí sí
    con `!important` porque esos son inline). "Almuerzo" y "Objetivo
    diario" no necesitaron cambios — ya seguían el acento/texto del
    tema, que en Neón ya es verde/blanco brillante.
  Verificado con Playwright: captura de Inicio en Neón muestra el
  botón "MODERADO" oscuro con borde y letra naranja brillante, y el
  gráfico semanal con barras celeste/verde/violeta/naranja y la línea
  de Gasto celeste, sin errores de consola. `npm run build` limpio.
- **2026-09-12**: dos ajustes a "Registrar con IA" (`AiEntryForm.tsx`),
  a pedido del usuario.
  1. **Grabación de audio se cortaba muy rápido**: el usuario notó que
     al hacer una pausa de un segundo para pensar, la grabación se
     frenaba sola. La Web Speech API por default termina el
     reconocimiento apenas detecta el final de una frase (silencio
     corto). Se activó `recognition.continuous = true`, que la deja
     escuchando varias frases/pausas seguidas hasta que el usuario
     toca "parar" a propósito (o hasta el timeout mucho más largo que
     usa el navegador por silencio total). Como en modo continuo
     `onresult` puede dispararse varias veces con resultados
     acumulados, se reescribió para ir concatenando solo lo que
     `event.resultIndex` marca como nuevo y finalizado (`isFinal`), en
     vez de leer siempre `results[0][0]` (que ya no alcanza en este
     modo).
  2. **La descripción no decía las kcal de cada alimento**: el usuario
     cargó "pollo" y el desglose solo mencionaba los gramos, no las
     kcal que aportaba. La causa: la app dependía de que el campo
     `detalle` (texto libre generado por la IA) mencionara los números
     correctamente, sin garantía. Como `parse-meal` ya devuelve
     `items` (cada alimento con su propio kcal/proteína exactos, la
     misma data que se termina guardando), se agregó una lista
     estructurada en el preview — cada item como
     "Pollo (250 g) — 412 kcal · 38g prot" — en vez de confiar en la
     prosa de `detalle`. También se ajustó el prompt de
     `/api/parse-meal` para que el nombre de cada item siempre
     incluya la cantidad entre paréntesis (antes decía solo "Pollo",
     ahora "Pollo (250 g)"), así la fila queda autocontenida sin tener
     que mirar el campo de ingredientes aparte.
  Probado con Playwright mockeando `/api/parse-meal`: al calcular
  "pollo", el preview muestra la fila "Pollo (250 g) · 412 kcal · 38g
  prot" (antes solo se veía el detalle en texto libre), sin errores de
  consola. La grabación en sí (silencio antes de cortar) no se puede
  probar en un navegador headless — depende del reconocimiento de voz
  real del dispositivo — pero el cambio de código (`continuous: true`
  + acumulación por `resultIndex`) es el fix estándar y documentado
  para este comportamiento de la Web Speech API. `npm run build`
  limpio.
- **2026-09-12**: tres pedidos más del usuario.
  1. **Color de Merienda en el gráfico semanal**: no le gustaba el
     celeste/gris-azulado (`#7C93A3`, compartido con "Grasas" en
     Macros y con el color de Sueño — esos otros dos usos no se
     tocaron). Cambiado a amarillo/dorado (`#C9A227`) en
     `WeeklyChart.tsx`, y a un amarillo neón (`#FFE000`, antes era
     violeta) en el override del tema Neón.
  2. **`MealItem` suma un campo `gramos`** (`lib/types.ts`) — el peso
     aproximado de la porción de ese alimento. `/api/parse-meal` ahora
     lo devuelve en cada item (antes solo lo mencionaba metido adentro
     del nombre, ej. "Pollo (250 g)" — se revirtió eso, ahora el
     nombre queda limpio y la cantidad vive en su propio campo
     estructurado). `AiEntryForm.tsx` lo muestra en el preview
     ("Pollo (250 g) · 412 kcal · 38g prot").
  3. **Editar los gramos en "Editar comidas de hoy" recalcula todo
     solo**: `TodayMealsBreakdown.tsx` ahora tiene un input de gramos
     por alimento (junto al nombre, arriba de kcal/proteína). Al
     cambiarlo, reescala kcal/proteína/carbohidratos/grasas/fibra en
     la misma proporción (`nuevoValor = valorViejo × gramosNuevos /
     gramosViejos`) en vez de dejar los números viejos desactualizados
     — si todavía no había gramos cargados, la primera vez solo se
     guarda el valor, sin reescalar (no hay desde qué proporción
     partir).
  Probado con Playwright: se carga "pollo" (250 g, 412 kcal, 38g
  proteína, 28g grasa) y se guarda; después se edita el campo de
  gramos de 250 a 500 directo en "Editar comidas de hoy" — kcal pasa a
  824, proteína a 76g, grasa a 56g (exactamente el doble), y la
  tarjeta "Hoy" se actualiza sola mostrando esos mismos valores, sin
  errores de consola. `npm run build` limpio.
- **2026-09-12**: dos pedidos más del usuario, con capturas de la app
  real en el celular.
  1. **Colores neón distintos entre solapas**: el usuario notó que
     Indicadores (gráfico semanal) ya se veía bien neón, pero Macros y
     Entrenamientos seguían con los colores apagados de siempre —
     pidió que sean los mismos colores en todas las solapas. Causa:
     solo se había agregado el override neón a `WeeklyChart.tsx`, no a
     `MacrosTab.tsx` ni `ActividadTab.tsx`. Se generalizaron las 3
     clases sueltas (`chart-des/chart-mer/chart-cen`) a una paleta de 4
     clases reusables en `globals.css` (`chart-neon-a` celeste,
     `chart-neon-b` amarillo, `chart-neon-c` violeta, `chart-neon-d`
     naranja, cada una cubriendo `fill`/`stroke`/`background-color` a
     la vez) y se aplicaron en los 3 lugares que ya compartían el
     mismo color base de siempre (des/proteína/pasos = mismo verde
     apagado → ahora los 3 celeste; merienda/kcal quemadas = mismo
     dorado → ahora los 2 amarillo; grasas/sueño = mismo gris-azulado →
     ahora los 2 violeta; cena/fibra/volumen = mismo terracota → ahora
     los 3 naranja). `WeekBarChart` (el componente compartido de
     Actividad) suma un prop `neonClass` para esto.
  2. **El campo de gramos aparecía vacío en comidas ya cargadas**: el
     usuario mandó una captura mostrando "—" en el campo de gramos de
     comidas que había cargado antes de que existiera ese campo (o que
     la IA no llegó a estimar). Pidió que se rellene solo, "que se
     actualice lo anterior" o "que lo calcule con las kcal". Se agregó
     un efecto en `TodayMealsBreakdown.tsx` que, al detectar un item
     sin `gramos` pero con `kcal > 0`, lo completa automáticamente con
     una estimación (`kcal ÷ 4`, un promedio razonable de kcal por
     gramo para una comida mixta) y lo guarda — a partir de ahí ya
     queda como un valor real, editable y con el recálculo proporcional
     de siempre.
  Probado con Playwright: en Neón, Macros muestra Proteína/Carbohidratos/
  Grasas/Fibra en celeste/verde/violeta/naranja (antes apagados) y
  Entrenamientos muestra Pasos/Kcal quemadas/Sueño/Volumen con la misma
  paleta — coherente con Indicadores. Un item cargado sin `gramos`
  (400 kcal) aparece solo con "100" en el campo de gramos apenas se
  abre la app, sin errores de consola. `npm run build` limpio.
