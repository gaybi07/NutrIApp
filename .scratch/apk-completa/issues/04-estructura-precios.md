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

**Client Plan (Alumno/Paciente)**:
- Básico: $0 (sin vínculo a Profe/Nutricionista).
- Premium: $4.000 ARS/mes (vínculo a un profesional — Profe O Nutricionista).
- Premium+: $8.000 ARS/mes (vínculo a los dos a la vez).

**Cuota del Profe/Nutricionista** (`trainer_applications.trainer_plan`, tiers nuevos por cupo):
- Gratis: hasta 1 alumno/paciente.
- $10.000 ARS/mes: hasta 5.
- $15.000 ARS/mes: hasta 12.
- $20.000 ARS/mes: sin límite de cupo por encima de 12.

**Split**: 50% para el profesional / 50% para la app, calculado **directo por alumno vinculado** (no pool/promedio) — es lo que soporta nativamente la API de `application_fee` de MercadoPago, y es más fácil de explicarle al profesional. Se calcula sobre lo que quede después de la comisión de MercadoPago (~7.6% con acreditación instantánea), no sobre el bruto.

**Baja a mitad de mes**: no se prorratea nada, ni el cobro al alumno ni el split al profesional — el pago ya cubrió la licencia por el mes completo, así que si se desvincula a mitad de mes el profesional ya cobró su parte de ese pago y no hay nada que devolver ni recalcular.

**Análisis de rentabilidad** (dólar blue ~$1.550 ARS al 2026-09-21, piso de costo fijo ~$45-57 USD/mes → ~$70.000-88.000 ARS/mes, sin contar impuesto PAÍS/Ganancias si el pago de Supabase/Vercel se hace con tarjeta argentina, que podría subir ese piso 30-60% más):
- El punto de equilibrio ronda los **20-25 alumnos/pacientes Premium pagos, repartidos entre 3-5 profesionales con cupo pago lleno** (ej. 4 profesionales en el tier de 5 llenos, o 2 en el tier de 12 llenos, ya cubren el piso bajo).
- Es esperable que los primeros 1-2 meses del grupo cerrado no cubran el piso — coherente con la prioridad de volumen del usuario. A partir de ese punto de equilibrio, cada profesional nuevo que llena su cupo empuja fuerte a superávit, porque el costo fijo no escala con usuarios.
- Riesgo a vigilar: costo fijo en USD, ingresos en ARS — la devaluación del peso exige revisar los montos ARS periódicamente para no perder margen real con el tiempo (no es una decisión de este ticket, es un recordatorio operativo).
