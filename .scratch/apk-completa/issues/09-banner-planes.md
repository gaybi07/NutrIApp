# Banner de planes (comparación Básico/Premium/Autoentreno/Premium+)

Type: prototype
Status: resolved

## Question

Cómo mostrarle al usuario, de un vistazo, qué incluye cada Client Plan y en qué se diferencian — necesario una vez que [la estructura de precios](04-estructura-precios.md) (ahora con 4 niveles, incluyendo Autoentreno) está fijada.

## Answer

Bocetos: https://claude.ai/artifact/T2JDsXX5N21V33BDMKa7hc (3 variantes iniciales) → refinado a un carrusel único: https://claude.ai/artifact/TQFZ61spuauPPqGamEM9zB

Elegido: **carrusel swipeable** con pill-tabs arriba (una por plan) para saltar directo, tarjetas con `scroll-snap` para deslizar con el dedo, y dots abajo marcando la posición. Cada tarjeta explica sus features con una línea descriptiva (no solo un check), y lo heredado del plan anterior se resume en una sola línea en cursiva ("Incluye todo lo de X, más:") en vez de repetir cada feature previo como bullet propio.

Con la incorporación de Autoentreno (ver [Estructura de precios](04-estructura-precios.md)), el carrusel quedó en 4 tarjetas: Básico → Premium → Autoentreno → Premium+, en ese orden (por precio creciente).

Prototipo descartable capturado en `design-scratch/prototype-planes-banner.html` (3 variantes iniciales) y `design-scratch/prototype-planes-carousel.html` (la ganadora, ya con 4 planes) — no se promueven tal cual, se reconstruyen como componente real.
