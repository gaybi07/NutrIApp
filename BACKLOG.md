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
- [ ] 11. Crear pantalla de "hoy" para registro rápido
      — hoy solo existe la vista semanal (Ledger); falta una vista enfocada en el día actual
- [x] 12. Verificar pasos y entreno
      — pasos editables por día (`DailySteps.tsx`, recién conectado) + intensidad de entreno en `Ledger.tsx`
- [x] 13. Añadir configuración de objetivo y ajustes
      — `GoalCalculator.tsx`
- [x] 14. Mejorar comparativas semanales
      — `WeeklyChart.tsx` + navegación entre semanas
- [ ] 15. Definir métricas para clientes / gimnasio
- [ ] 16. Armar MVP para app Android vía Capacitor
- [ ] 17. Diseñar íconos y splash para APK
- [ ] 18. Pruebas en dispositivo real
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

## Registro de cambios

- **2026-09-09**: arreglado build roto (`RecipePlanner` pedía `dailyGoal`/`consumedKcal`
  que `page.tsx` no pasaba). Conectados `DailySteps.tsx` y `DataImport.tsx`, que existían
  como componentes huérfanos sin usar. Reemplazado el botón duplicado "Consumo / objetivo"
  por "Datos" (abre `DataImport`).
- **2026-09-09**: primer intento de deploy en Vercel falló — `lib/useLocalDays.ts`
  importaba `@/registro_export.json` (datos personales, gitignoreados) como seed para
  usuarios nuevos, y Vercel no podía resolver el import. Se sacó el seed: usuarios/
  dispositivos nuevos ahora arrancan vacíos, que es lo correcto para un producto real.
