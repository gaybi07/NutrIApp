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

## Not yet specified

- Si el Nutricionista tiene su propio flujo de "postulación/aprobación" como `Trainer Application`, o reusa el mismo — depende de que se resuelvan primero el modelo de datos del Plan Nutricional y cuánto se comparte con Entrenador (tickets 01 y 02).
- Requisitos concretos de Google Play / Apple App Store para publicar ahí de verdad (más allá de lo ya sabido: cuenta de developer, revisión) — se detalla cuando la fase de Empaquetado avance más allá de la investigación inicial (ticket 07).
- Cómo se ve la pantalla de "liquidaciones" del profesional (cuánto le queda pendiente de cobrar, historial de lo que ya recibió) — depende de que [el split de pagos](issues/05-mercadopago-split.md) y [la estructura de precios](issues/04-estructura-precios.md) estén resueltos.

## Out of scope

- Stripe / cobro multi-moneda — fuera de este mapa, se retoma como esfuerzo aparte si el público se amplía fuera de Argentina.
- Cuenta de Apple Developer y publicación real en la App Store — fuera de este mapa por ahora (ver Notes).
