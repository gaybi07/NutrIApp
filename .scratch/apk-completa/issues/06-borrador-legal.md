# Borrador de Términos y Condiciones / Privacidad / Cookies

Type: task
Status: resolved

## Question

No es una decisión a tomar sino trabajo manual que hay que hacer antes de poder publicar cualquier cosa relacionada a pagos: redactar un primer borrador basado en lo que la app hace de verdad (qué datos guarda — comidas, peso, rutinas, fotos de etiquetas; qué IA usa — Gemini/Anthropic, y que se manda a un tercero; qué cobra y cómo — MercadoPago; el mecanismo de split a profesionales una vez definido en [Estructura de precios](04-estructura-precios.md)).

Entregable: un borrador en español (Términos y Condiciones, Política de Privacidad, Política de Cookies) que el usuario lleva a un abogado antes de publicar nada — **Claude no da esto por válido legalmente, solo arma el punto de partida**.

## Blocked by

04

## Answer

Borrador entregado como documento (3 solapas: Términos y Condiciones, Política de Privacidad, Política de Cookies): https://claude.ai/artifact/Nr41PEBP9daHEcwYdDtzLi

Redactado a partir de una auditoría real del código (no supuestos): qué tablas/datos guarda la app (comidas, peso, sueño, entrenamientos, Alacena/household compartido, plan nutricional, ejecuciones, incidencias, comentarios/reportes de Profe-Nutricionista), qué se manda a Gemini/Anthropic (texto de comidas y fotos de etiquetas — la foto no se guarda), qué guarda Supabase/Vercel, que MercadoPago todavía no está integrado en código (solo planificado), que no hay hoy un flujo de borrado de cuenta autogestionado, y que `localStorage` se usa solo para preferencias/caché local (sin cookies de tracking ni analítica de terceros).

Incorpora los montos y el mecanismo de split ya definidos en [Estructura de precios](04-estructura-precios.md). Cada documento tiene un aviso de "BORRADOR — falta validación legal" arriba y varios corchetes `[Completar: ...]` para razón social/CUIT/jurisdicción que el usuario define con su abogado — **no se publica nada de esto sin esa revisión**, como se acordó en el ticket original.
