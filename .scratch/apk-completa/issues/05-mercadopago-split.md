# Pagos split en MercadoPago (comisión a Profe/Nutricionista)

Type: research
Status: resolved

## Question

El usuario confirmó que el Profe/Nutricionista recibe un % de lo que pagan sus alumnos/pacientes vinculados (además de su propia cuota fija). Investigar cómo se implementa esto de verdad con MercadoPago:

- ¿MercadoPago tiene una API de "marketplace"/split de pagos (dividir automáticamente un cobro entre la plataforma y un tercero), o hay que simularlo con transferencias manuales/programadas después de cobrar?
- Qué necesita cada Profe/Nutricionista para poder recibir esos pagos (¿cuenta de MercadoPago propia vinculada? ¿datos fiscales/CBU? proceso de alta).
- Cómo se manejan reembolsos, bajas a mitad de mes, y qué pasa con el split ya transferido en esos casos.
- Implicancias impositivas/de facturación en Argentina para este tipo de intermediación (a alto nivel — no reemplaza asesoramiento contable real, pero conviene saber qué complejidad hay antes de prometerle esto a un profesional).
- Costo/comisión que cobra MercadoPago por usar esta función, si existe.

Esto alimenta a [Estructura de precios](04-estructura-precios.md) (el % exacto y las reglas del split se definen ahí, una vez que se sepa qué es técnicamente posible).

## Answer

Investigación completa en [`research/05-mercadopago-split.md`](../research/05-mercadopago-split.md).

**Es factible**: MercadoPago tiene "Split de Pagos" real y automático (modelo marketplace 1:1), confirmado disponible en Argentina, usando `application_fee`/`marketplace_fee` al momento del cobro — la plataforma y el profesional se quedan cada uno con su parte sin transferencias manuales.

Complejidad media-alta, ojo con esto antes de prometerlo:
- **Cada Profe/Nutricionista necesita su propia cuenta de MercadoPago** y completar un flujo de autorización OAuth ("Connect") — no alcanza con que tenga cuenta en la app.
- **Los reembolsos solo se recuperan proporcionalmente de forma automática** — la plataforma tiene que construir su propia reconciliación para los casos raros.
- **El tema impositivo/facturación en Argentina queda sin resolver por la propia documentación de MercadoPago** (quién le factura a quién, límites de monotributo, tratamiento AFIP) — la investigación lo marca explícitamente como algo que necesita un contador, no algo que se pueda asumir.
- Una página de comisiones específica de Argentina dio error 403 al consultarla — hay que reverificarla a mano antes de fijar el % final en [Estructura de precios](04-estructura-precios.md).

**Para el mapa**: viable técnicamente, pero el onboarding de cada profesional (OAuth + likely monotributo) y la parte impositiva son trabajo real aparte de la integración de pagos en sí — no es "prender un flag".
