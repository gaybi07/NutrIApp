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
  Pendiente: confirmar que desaparece el banner de sync después de correrla.
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
