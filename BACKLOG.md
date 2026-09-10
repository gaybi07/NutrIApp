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
