# Pagos split en MercadoPago (comisión a Profe/Nutricionista)

Type: research
Status: open

## Question

El usuario confirmó que el Profe/Nutricionista recibe un % de lo que pagan sus alumnos/pacientes vinculados (además de su propia cuota fija). Investigar cómo se implementa esto de verdad con MercadoPago:

- ¿MercadoPago tiene una API de "marketplace"/split de pagos (dividir automáticamente un cobro entre la plataforma y un tercero), o hay que simularlo con transferencias manuales/programadas después de cobrar?
- Qué necesita cada Profe/Nutricionista para poder recibir esos pagos (¿cuenta de MercadoPago propia vinculada? ¿datos fiscales/CBU? proceso de alta).
- Cómo se manejan reembolsos, bajas a mitad de mes, y qué pasa con el split ya transferido en esos casos.
- Implicancias impositivas/de facturación en Argentina para este tipo de intermediación (a alto nivel — no reemplaza asesoramiento contable real, pero conviene saber qué complejidad hay antes de prometerle esto a un profesional).
- Costo/comisión que cobra MercadoPago por usar esta función, si existe.

Esto alimenta a [Estructura de precios](04-estructura-precios.md) (el % exacto y las reglas del split se definen ahí, una vez que se sepa qué es técnicamente posible).
