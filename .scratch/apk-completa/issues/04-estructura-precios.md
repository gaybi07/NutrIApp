# Estructura de precios y niveles de suscripción

Type: grilling
Status: open

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
