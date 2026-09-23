# Pantalla de "liquidaciones" del profesional

Type: prototype
Status: resolved

## Question

Con [Estructura de precios](04-estructura-precios.md) y [Pagos split en MercadoPago](05-mercadopago-split.md) ya resueltos, se puede especificar esta pantalla: cómo el Profe/Nutricionista ve cuánto le queda pendiente de cobrar (split de sus alumnos/pacientes vinculados) y el historial de lo que ya recibió.

Debe mostrar, como mínimo:
- Cupo actual (ej. "8 de 12 alumnos") y su tier de cuota.
- Estimado de split del mes en curso (suma de 50% de cada alumno/paciente Premium/Premium+ vinculado, ya neto de la comisión de MercadoPago).
- Si ese estimado cubre o no la cuota mensual del profesional (el "plus" del que habla el modelo de precios).
- Historial de liquidaciones pasadas (mes, monto, estado — pendiente/pagado).

Bocetar 2-3 variantes rápidas (throwaway HTML, estilo denso mono/gold dark-theme) para comparar layout antes de que esto entre al spec de construcción.

## Blocked by

(ninguno — 04 y 05 ya resueltos)

## Answer

Bocetos: https://claude.ai/artifact/FpPtjvTzExEwV9Zko92MKd (3 variantes descartables).

Elegida: **Variante A** (número hero + desglose), con un ajuste sobre el boceto — el desglose del split **no se agrupa por tier de plan** ("Split 50% · 8 alumnos Premium"), sino que **discrimina fila por fila, por alumno/paciente** (nombre + su aporte neto), aunque la lista crezca con el cupo. Queda así para el spec de construcción:

- Tarjeta hero: estimado del mes + si cubre o no la cuota (igual que el boceto).
- Desglose: una fila `− Cuota (tier X alumnos)`, seguida de una fila por cada alumno/paciente vinculado y pagando (`nombre` + su 50% neto individual), total al pie.
- Historial de liquidaciones pasadas (mes/monto/estado), igual que el boceto.

Prototipo descartable capturado en `design-scratch/prototype-liquidaciones.html` (no se promueve tal cual — se reconstruye como componente real con el ajuste de desglose por alumno).
