# Estructura de precios y niveles de suscripción

Type: grilling
Status: resolved

## Question

Dos mecanismos de cobro confirmados con el usuario, que se combinan (no se reemplazan):

1. **Lo que paga el Alumno/Paciente**: los niveles ya existen en el código (Básico/Premium/Premium+), pero sin cobro real todavía. Premium = vínculo a un profesional (Profe o Nutricionista). Premium+ = vínculo a los dos a la vez (Profe Y Nutricionista).
2. **Lo que paga el Profe/Nutricionista**: una cuota mensual fija por el cupo de alumnos (ej. hasta 10) — esto ya existe parcialmente en el código como `trainer_applications.trainer_plan` (`gratis`/`pago`, gobierna `max_students`), pero sin cobro real ni definición de cuánto cuesta cada tier.
3. **Además**, el Profe/Nutricionista recibe un % de lo que sus alumnos/pacientes pagan por su Premium dentro de la app (split de pagos) — confirmado con el usuario como mecanismo adicional a la cuota fija, pensado para que cubra su propia cuota y le quede un plus si tiene el cupo lleno.

Resolver con el usuario (grilling), una vez que [Costos operativos](03-costos-operativos.md) dé un piso de precio:
- Montos concretos: Básico ($0), Premium, Premium+, cuota de Profe/Nutricionista (free tier vs. pago, y cuánto).
- Porcentaje exacto del split hacia el profesional (el usuario mencionó 50% como punto de partida, a confirmar).
- ¿El split se calcula sobre lo que paga CADA alumno vinculado, o sobre un pool/promedio? ¿Se paga aunque el profesional esté en el tier gratis de su propia cuota?
- ¿Qué pasa si un alumno se desvincula a mitad de mes (¿se prorratea el split?).

## Blocked by

03

## Answer

Prioridad explícita del usuario: volumen/masividad por sobre margen alto — precios pensados para que valga la pena entrar, no para maximizar margen por usuario desde el día uno.

**Client Plan (Alumno/Paciente)** — 4 niveles (agregado Autoentreno el 2026-09-23, ver también `CONTEXT.md`):
- Básico: $0 — sin vínculo, sin plan armado por IA, sin reportes. Registro 100% manual.
- Premium: $4.500 ARS/mes — vínculo a un profesional humano (Profe O Nutricionista), split 50/50 con la app.
- Autoentreno: $6.000 ARS/mes — sin ningún profesional humano ni Trainer Link, pero la IA arma un plan semanal completo de **las dos disciplinas** (rutinas de entrenamiento Y plan de comidas con opciones), con reportes de adherencia. Vale más que Premium porque cubre ambas disciplinas a la vez; vale menos que Premium+ porque no hay una persona real revisándolo. **Sin split** — no hay profesional a quien pagarle, así que (más allá del costo marginal de IA) es el plan de mayor margen para la app en proporción a su precio.
- Premium+: $9.000 ARS/mes — vínculo a los dos profesionales humanos a la vez (se mantiene como el doble exacto de Premium para no romper la lógica del split por porciones).

*(Ajustado el 2026-09-23: subido ~12,5% desde el número inicial de $4.000/$8.000 a pedido del usuario, manteniendo la relación 2× entre Premium y Premium+; en la misma conversación se agregó el nivel Autoentreno entre ambos.)*

**Cuota del Profe/Nutricionista** (`trainer_applications.trainer_plan`, tiers nuevos por cupo):
- Gratis: hasta 1 alumno/paciente.
- $10.000 ARS/mes: hasta 5.
- $15.000 ARS/mes: hasta 12.
- $20.000 ARS/mes: sin límite de cupo por encima de 12.

**Split**: 50% para el profesional / 50% para la app, calculado **directo por alumno vinculado** (no pool/promedio) — es lo que soporta nativamente la API de `application_fee` de MercadoPago, y es más fácil de explicarle al profesional. Se calcula sobre lo que quede después de la comisión de MercadoPago (~7.6% con acreditación instantánea), no sobre el bruto.

**Premium+ con Profe Y Nutricionista a la vez (aclaración, no un tercer mecanismo)**: el split nunca se reparte en tres partes iguales. Premium+ ($9.000) ya está armado como el doble exacto de Premium ($4.500 × 2) precisamente porque implica dos vínculos — se trata como **dos porciones independientes de $4.500** (una de entrenamiento, una de nutrición), cada una con su propio split 50/50: el Profe cobra 50% de la porción de entrenamiento (~$2.250 bruto, ~$2.079 neto de comisión MP), el Nutricionista cobra lo mismo de la porción de nutrición, y a la app le sigue quedando el 50% total — el mismo margen porcentual que en cualquier otro caso, y cada profesional cobra lo mismo que cobraría si tuviera a ese alumno solo en Premium con él.

**Baja a mitad de mes**: no se prorratea nada, ni el cobro al alumno ni el split al profesional — el pago ya cubrió la licencia por el mes completo, así que si se desvincula a mitad de mes el profesional ya cobró su parte de ese pago y no hay nada que devolver ni recalcular.

**Análisis de rentabilidad** (dólar blue ~$1.550 ARS al 2026-09-21, piso de costo fijo ~$45-57 USD/mes → ~$70.000-88.000 ARS/mes, sin contar impuesto PAÍS/Ganancias si el pago de Supabase/Vercel se hace con tarjeta argentina, que podría subir ese piso 30-60% más; recalculado con los precios subidos a $4.500/$9.000):
- El punto de equilibrio ronda los **18-22 alumnos/pacientes Premium pagos, repartidos entre 3-5 profesionales con cupo pago lleno** (ej. 4 profesionales en el tier de 5 llenos ya rondan los $81.500, o 2 en el tier de 12 llenos rondan los $80.000) — el aumento del ~12,5% en el precio baja un poco el volumen necesario para cubrir el piso, sin cambiar la forma del modelo.
- Es esperable que los primeros 1-2 meses del grupo cerrado no cubran el piso — coherente con la prioridad de volumen del usuario. A partir de ese punto de equilibrio, cada profesional nuevo que llena su cupo empuja fuerte a superávit, porque el costo fijo no escala con usuarios.
- Riesgo a vigilar: costo fijo en USD, ingresos en ARS — la devaluación del peso exige revisar los montos ARS periódicamente para no perder margen real con el tiempo (no es una decisión de este ticket, es un recordatorio operativo).
