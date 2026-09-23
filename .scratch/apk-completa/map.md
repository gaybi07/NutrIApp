# Mapa: registro-app → APK completa (wayfinder:map)

## Destino

Un **spec por fases**, listo para que Claude lo empiece a construir en próximas sesiones (no la APK funcionando de punta a punta en este mapa) — llevar `registro-app` de app web a una APK instalable con: rol **Nutricionista** (análogo a Profe/Alumno, con **Paciente** en vez de Alumno), **niveles de suscripción reales con cobro** (MercadoPago, precio a definir para cubrir costos), y **empaquetado como app instalable** (Android primero vía APK compartido directo a un grupo cerrado, pensado desde el día uno para eventual distribución en Google Play y Apple App Store).

Orden de trabajo: **Nutricionista → Pagos → Empaquetado**.

## Notes

- Dominio: reusar el vocabulario ya fijado en `CONTEXT.md` (Alumno/Profe/Autoentrenador, Client Plan, Trainer Link). "Nutricionista"/"Paciente" es vocabulario paralelo nuevo — mismo esqueleto que Profe/Alumno (vínculo 1 a 1, plan semanal, sesión con snapshot), pero el plan nutricional se arma como **"planificaciones con opciones y recomendaciones"**, no una prescripción única fija por día como sí es una rutina de fuerza.
- Al tocar términos del dominio: cargar `domain-modeling` y actualizar `CONTEXT.md` en el momento, no al final.
- Decisión de arquitectura pendiente (no del usuario, mía): cuánto de la UI/reportes se comparte entre Entrenador y Nutricionista vs. cuánto es separado — el usuario lo delegó explícitamente ("eso velo vos").
- Legal: Claude redacta el borrador de Términos y Condiciones / Privacidad / Cookies basado en lo que la app hace de verdad — **nunca se publica sin que el usuario lo valide con un abogado primero**. No es asesoramiento legal vinculante.
- Pagos: MercadoPago (ARS) primero: el grupo cerrado inicial es en Argentina. Stripe/multi-moneda queda fuera de este mapa hasta que haga falta.
- Precio: objetivo es cubrir costos operativos + margen, con estructura fácil de ajustar después — el número exacto es parte de lo que este mapa tiene que fijar (ticket, no decidido de antemano).
- **Monetización de Profe/Nutricionista — dos mecanismos combinados, confirmados con el usuario**: (1) una cuota mensual fija por su propio cupo de alumnos (ya hay un esqueleto en el código, `trainer_applications.trainer_plan`, sin cobro real), y (2) un % (el usuario mencionó 50% como punto de partida) de lo que cada alumno/paciente vinculado paga por su Premium dentro de la app. La idea explícita del usuario: si el profesional llena su cupo (ej. 10 alumnos pagos), el % que recibe cubre su propia cuota y le queda un plus — incentivo para que sume gente a la app.
- Distribución: cerrada primero (amigos/clientes actuales del usuario) — Android por archivo APK compartido directo, sin pasar por ninguna store todavía. El objetivo declarado es eventualmente entrar a Google Play y Apple App Store.
- Cuenta de Apple Developer (u$s99/año, necesaria para iOS/App Store): **fuera de este mapa por ahora** — el usuario puede conseguir una prestada para pruebas. No bloquea nada de lo demás.
- Al final de cada sesión de trabajo sobre este mapa: `npx tsc --noEmit` + `npm run build` limpios antes de dar cualquier ticket por resuelto que haya tocado código; commits con el mismo estilo/atribución que el resto del repo.

## Decisions so far

- [Costos operativos](issues/03-costos-operativos.md): Supabase+Vercel son ~$45/mes fijos desde el día 1 (no escalan con uso). IA es marginal (~$0.18-24/mes según escala). MercadoPago cobra ~7.6% por acreditación instantánea. El piso de precio hay que pensarlo cubriendo el costo fijo total, no el costo marginal por usuario.
- [Pagos split en MercadoPago](issues/05-mercadopago-split.md): factible (API de marketplace real, `application_fee`), pero cada profesional necesita su propia cuenta + OAuth "Connect", los reembolsos no se revierten solos del todo, y el tema impositivo en Argentina queda sin resolver por MercadoPago — necesita un contador antes de prometerlo.
- [Empaquetado APK](issues/07-empaquetado-apk.md): arrancar con PWA/TWA (Bubblewrap) para el Android del grupo cerrado — no toca el código actual. Capacitor queda para más adelante, cuando se invierta en serio en iOS (ni PWA ni Capacitor dan iOS "gratis": Apple rechaza los wrappers de PWA).
- [Modelo de datos del Plan Nutricional](issues/01-modelo-plan-nutricional.md): reusa `training_plans`/`assigned_sessions` con campo `disciplina`, sin tablas nuevas. Cada día tiene 2-3 Meal Options por comida (macros + explicación revisada por el Nutricionista, IA solo como borrador). Congela por semana completa (no por día), sin equivalente a Workout Execution — adherencia sale de comparar registro real vs. plan en el Student Report semanal.
- [Qué se comparte entre Entrenador y Nutricionista](issues/02-compartido-entrenador-nutricionista.md): dos tabs separadas (no una "Profesional" con selector), mismo dashboard-shell y mismo `Student Report`/`Trainer Comment` reusados tal cual; `Routine Incident` queda exclusivo de fuerza. `Trainer Link` necesita que su regla de "un vínculo activo" pase a ser por disciplina, para permitir tener Profe y Nutricionista a la vez.
- [Estructura de precios](issues/04-estructura-precios.md): 4 niveles — Básico $0, Premium $4.500, Autoentreno $6.000 (IA arma plan de ambas disciplinas, sin profesional humano, sin split), Premium+ $9.000 ARS/mes. Cuota profesional: gratis (1 alumno), $10.000 (5), $15.000 (12), $20.000 (sin límite). Split 50/50 directo por alumno, sin prorratear bajas a mitad de mes. Premium+ con Profe y Nutricionista a la vez = dos porciones de $4.500 con su propio 50/50 cada una (nunca 33/33/33). Punto de equilibrio ≈ 18-22 alumnos Premium repartidos en 3-5 profesionales con cupo lleno.
- [Borrador legal](issues/06-borrador-legal.md): T&C/Privacidad/Cookies redactados como documento (3 solapas), basados en auditoría real del código — pendiente de validación con abogado antes de publicar.
- [Pantalla de liquidaciones](issues/08-pantalla-liquidaciones.md): variante "número hero + desglose", pero con el split discriminado fila por fila por alumno/paciente (no agrupado por tier), más historial mensual.
- [Banner de planes](issues/09-banner-planes.md): carrusel swipeable de 4 tarjetas (Básico/Premium/Autoentreno/Premium+) con pill-tabs + dots, herencia de features resumida en una línea en vez de repetirlas.

## Not yet specified

- Cómo genera el plan Autoentreno técnicamente: [el modelo de datos del Plan Nutricional](issues/01-modelo-plan-nutricional.md) asume `training_plans`/`assigned_sessions` con un `trainer_id` real (un profesional humano) — Autoentreno necesita un plan generado por IA sin ningún profesional detrás, lo cual puede requerir `trainer_id` nulable ("autor: sistema") o un camino de generación totalmente distinto que no pase por estas tablas. Además, a diferencia del plan de un profesional (de solo lectura para el alumno), el de Autoentreno tiene que ser **editable a mano** por el usuario y soportar "duplicar la semana anterior y ajustar" (mismo patrón que el botón "Duplicar" ya construido para Trainer Routines) — para no tener que regenerar todo de cero cada semana. Se resuelve cuando se lo empiece a construir, no bloquea el resto del spec.

- Requisitos concretos de Google Play / Apple App Store para publicar ahí de verdad (más allá de lo ya sabido: cuenta de developer, revisión) — se detalla cuando la fase de Empaquetado avance más allá de la investigación inicial (ticket 07).

## Out of scope

- Stripe / cobro multi-moneda — fuera de este mapa, se retoma como esfuerzo aparte si el público se amplía fuera de Argentina.
- Cuenta de Apple Developer y publicación real en la App Store — fuera de este mapa por ahora (ver Notes).
