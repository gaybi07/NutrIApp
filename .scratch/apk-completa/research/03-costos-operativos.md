# Costos operativos — piso de precio para la suscripción

Investigación de costos de infraestructura para establecer un **piso de precio** ("cubrir costos operativos") de la nueva feature de suscripción. Todas las cifras están citadas contra fuentes primarias (páginas oficiales de pricing/docs), con fecha de verificación **2026-09-23**. Cuando la fuente oficial no publica un número exacto (pasa con los rate limits de Gemini), se indica explícitamente y se usa una fuente secundaria solo como referencia, marcada como tal.

---

## 1. Supabase — Free vs Pro

Fuente: [supabase.com/pricing](https://supabase.com/pricing) — verificado 2026-09-23.

| | Free | Pro ($25/mes) |
|---|---|---|
| Precio | $0/mes | $25/mes + créditos de cómputo incluidos ($10/mes, cubre 1 instancia Micro) |
| Tamaño de base de datos | 500 MB (CPU compartida, 500 MB RAM) | 8 GB incluidos, luego **$0.125/GB** |
| File storage | 1 GB | 100 GB incluidos, luego **$0.0213/GB** |
| Auth MAU (usuarios activos mensuales) | 50,000 | 100,000 incluidos, luego **$0.00325/MAU** |
| Egress/bandwidth | 5 GB | 250 GB incluidos, luego **$0.09/GB** |
| Egress cacheado | 5 GB | 250 GB incluidos, luego **$0.03/GB** |
| Overage/uso adicional | No disponible (no hay facturación por uso en Free) | Disponible, ver arriba |

**Límite operativo clave que no es de tamaño:** los proyectos Free se **pausan automáticamente tras 7 días de inactividad** (con aviso previo por mail); los datos se conservan hasta 1 año pero la app queda offline hasta reactivarla manualmente. Los planes pagos (incluido Pro) **no se pausan nunca**. Fuente: [supabase.com/docs/guides/platform/free-project-pausing](https://supabase.com/docs/guides/platform/free-project-pausing) — verificado 2026-09-23.

**Cuándo migrar de Free a Pro:** para una app chica como esta, los límites de tamaño (500 MB DB, 50k MAU, 5 GB egress) son generosos y probablemente no se tocan ni con 200 usuarios activos reales (los datos de comidas/entrenamientos son livianos; 50k MAU es ~1000x los usuarios objetivo). El motivo real para pasar a Pro **no es el tamaño, es el pausado por inactividad**: un producto pago no puede depender de un proyecto que se apaga solo si no hay tráfico. Conclusión: **Pro ($25/mes) es obligatorio desde el día 1 de monetización**, independientemente de la escala — no es un umbral de usuarios, es un requisito de "estar siempre online" para un producto pago.

---

## 2. Vercel — Hobby vs Pro

Fuente: [vercel.com/pricing](https://vercel.com/pricing) — verificado 2026-09-23.

| | Hobby (Free) | Pro ($20/mes) |
|---|---|---|
| Precio | $0/mes | $20/mes por miembro |
| Bandwidth (Fast Data Transfer) | 100 GB/mes | 1 TB/mes incluido, luego desde **$0.15/GB** |
| Function Invocations | 1M/mes incluidas | desde **$0.60 por 1M** |
| Fluid Active CPU | 4 horas/mes incluidas | desde **$0.128/hora** |
| Edge Requests | 1M/mes | 10M/mes incluidos, luego desde **$2 por 1M** |
| Build minutes | máquinas básicas únicamente | $0.007/min (básica), $0.014 (estándar), $0.028 (enhanced) |
| Uso comercial | **Prohibido** — "Hobby plan is for personal, non-commercial use" (según FAQ del sitio) | Permitido |

**Esto es decisivo, no solo un umbral de escala:** el plan Hobby está explícitamente restringido a uso no-comercial. En el momento en que esta app cobra una suscripción, deja de calificar para Hobby por los términos de servicio, sin importar cuánto tráfico tenga. **Pro ($20/mes) es obligatorio desde el día 1**, igual que con Supabase — no es algo que se dispare a cierta cantidad de usuarios, es un requisito contractual apenas hay ingresos.

---

## 3. Google Gemini API — modelo usado: `gemini-3.6-flash`

Confirmado en código fuente: `lib/geminiClient.ts:60` — `const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";`. Es el modelo por defecto que usan las 4 rutas (`parse-nutrition-label`, `parse-meal`, `parse-shopping`, `review-inventory`), todas con Gemini como intento primario ("gratis") y Anthropic como respaldo si Gemini falla o está saturado.

### Pricing (paga)

Fuente: [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) — verificado 2026-09-23.

| | Free tier | Standard (paga) — vigente hasta 31-dic-2026 | Standard — desde 1-ene-2027 |
|---|---|---|---|
| Input | Gratis | **$0.75 / 1M tokens** | $1.50 / 1M tokens |
| Output | Gratis | **$3.75 / 1M tokens** | $7.50 / 1M tokens |
| Batch/Flex input | Gratis | $0.375 / 1M | $0.75 / 1M |
| Batch/Flex output | Gratis | $1.875 / 1M | $3.75 / 1M |
| Context caching | — | $0.075 / 1M (+ storage) | $0.15 / 1M |

Nota: es pricing introductorio de lanzamiento (el modelo salió el 21-jul-2026 según la búsqueda), sube ~2x el 1-ene-2027 — vale la pena tenerlo en cuenta para el piso de precio a mediano plazo.

**Tokens de imagen:** según [ai.google.dev/gemini-api/docs/tokens](https://ai.google.dev/gemini-api/docs/tokens) (verificado 2026-09-23), una imagen ≤384px en ambas dimensiones cuenta 258 tokens; imágenes más grandes se "tilean" en bloques de 768x768px, cada uno también 258 tokens. Una foto de celular típica (etiqueta nutricional o ticket) cae en 2-4 tiles ≈ **500-1000 tokens de imagen**, se usa 750 como estimación media en la sección 4.

### Rate limits (free tier)

**No pude confirmar el número exacto contra la fuente primaria.** [ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits) (verificado 2026-09-23) ya no publica tablas de RPM/RPD/TPM por modelo — dice textualmente que los límites "depend on a variety of factors (such as your usage tier) and can be viewed in Google AI Studio", y remite al dashboard de AI Studio (que requiere login, no accesible para esta investigación).

Como referencia no oficial (fuentes secundarias, no verificadas contra la fuente primaria, solo para tener una magnitud): reportes de terceros en septiembre 2026 ubican el free tier de modelos "Flash" en el orden de **10-15 RPM / ~1,500 RPD / ~250,000 TPM**, con caveat explícito de esas mismas fuentes de que Google ya no garantiza ni publica esos números. **No usar estas cifras para SLA — son orientativas.**

Implicación práctica: con los volúmenes estimados en la sección 4 (7-143 llamadas IA/día según escala), el free tier de Gemini alcanzaría de sobra en RPD incluso a 200 usuarios, pero podría gatillar el fallback a Claude en picos de uso concurrente (ej. hora de la cena) si el RPM real es bajo.

---

## 4. Anthropic Claude API — `claude-sonnet-4-6` (respaldo)

Confirmado en código fuente: `model: "claude-sonnet-4-6"` en las 4 rutas (`parse-nutrition-label`, `parse-meal`, `parse-shopping`, `review-inventory`), usado únicamente cuando Gemini falla/satura Y hay `ANTHROPIC_API_KEY` configurada.

### Pricing

Fuente: [claude.com/pricing](https://claude.com/pricing) (redirect oficial desde anthropic.com/pricing) — verificado 2026-09-23.

| Modelo | Input / 1M tok | Output / 1M tok | Cache read | Cache write |
|---|---|---|---|---|
| **Sonnet 4.6** (el usado en el código) | **$3.00** | **$15.00** | $0.30 | $3.75 |
| Sonnet 5 (generación actual, no usado acá) | $2.00 | $10.00 | $0.20 | $2.50 |

### Estimación de costo mensual — supuestos explícitos

**Supuestos de uso** (no hay datos de producción reales, son estimaciones razonables para una app de nutrición/entrenamiento de uso diario):

- **5 llamadas de IA por usuario activo por semana**, repartidas:
  - 2 llamadas con imagen (vision): 1 foto de etiqueta nutricional (`parse-nutrition-label`) + 1 foto/texto de ticket de compra (`parse-shopping`)
  - 3 llamadas de solo texto: 2x `parse-meal` (comida dictada/escrita) + 1x `review-inventory`
  - (En la práctica varias `parse-meal` se resuelven localmente sin IA vía `resolveMealFromFoods` cuando el alimento ya es conocido — este supuesto ignora ese ahorro, así que es conservador/pesimista)
- **Tokens por llamada con imagen:** ~750 tokens de imagen (foto de celular, 2-4 tiles de 258 tokens c/u) + ~350 tokens de prompt/sistema = **~1,100 tokens de input**, **~200 tokens de output** (JSON corto)
- **Tokens por llamada de solo texto:** **~400 tokens de input** (system prompt + texto del usuario), **~250 tokens de output** (JSON con desglose de items)

**Cálculo por usuario por mes** (4.33 semanas/mes):

- Input semanal: 2×1,100 + 3×400 = 3,400 tokens → mensual ≈ **14,700 tokens**
- Output semanal: 2×200 + 3×250 = 1,150 tokens → mensual ≈ **4,980 tokens**

**Costo si TODO corriera en Gemini pagado** (sin usar el free tier):
- Input: 14,700 / 1,000,000 × $0.75 = $0.011
- Output: 4,980 / 1,000,000 × $3.75 = $0.019
- **≈ $0.030 / usuario / mes**

**Costo si TODO corriera en Claude (caso peor: Gemini caído/saturado 100% del tiempo)**:
- Input: 14,700 / 1,000,000 × $3.00 = $0.044
- Output: 4,980 / 1,000,000 × $15.00 = $0.075
- **≈ $0.119 / usuario / mes**

**Escenario realista** (Gemini free tier cubre la mayoría de las llamadas por estar muy por debajo de los límites de RPD estimados, con ~15% de fallback a Claude por picos de concurrencia/RPM):
- 85% gratis (Gemini free tier, $0) + 15% a Claude ($0.119 × 0.15 = $0.0179)
- **≈ $0.018 / usuario / mes**

| Usuarios activos | Costo IA (escenario realista, 15% fallback) | Costo IA (caso peor, 100% Claude) |
|---|---|---|
| 10 | $0.18 | $1.19 |
| 50 | $0.90 | $5.95 |
| 200 | $3.60 | $23.80 |

**Conclusión:** el costo de IA es marginal frente a Supabase/Vercel en cualquier escenario razonable, incluso en el caso peor de que Gemini estuviera caído todo el mes y todo cayera a Claude. El riesgo real no es el costo sino la dependencia del free tier de Gemini para mantenerlo así de barato — si Google endurece los límites o el precio introductorio sube en 2027, el piso de precio debería revisarse.

---

## 5. MercadoPago — comisión de la plataforma (Argentina)

Fuente: [mercadopago.com.ar/herramientas-para-vender/check-out](https://www.mercadopago.com.ar/herramientas-para-vender/check-out) — verificado 2026-09-23. Cifras confirmadas también por fuentes secundarias consistentes (iprofesional.com, sept 2026).

Comisión sobre el checkout online, según plazo de acreditación del dinero al vendedor:

| Plazo de acreditación | Comisión |
|---|---|
| Acreditación **instantánea** | **6.29% + IVA** |
| A los 10 días | 4.39% + IVA |
| A los 18 días | 3.39% + IVA |
| A los 35 días | 1.49% + IVA |

Nota oficial: "los costos pueden variar de acuerdo a los impuestos provinciales" (Ingresos Brutos varía según jurisdicción de inscripción del vendedor).

Esta comisión es **la que se lleva MercadoPago**, separada de cualquier % que la app luego defina para el revenue-split con entrenadores/nutricionistas — ese split se resta sobre lo que queda después de esta comisión.

Para el piso de precio, conviene asumir el escenario más caro y más simple operativamente: **acreditación instantánea, ≈6.3% + IVA (IVA 21% en Argentina) ≈ 7.6% efectivo sobre el precio de venta**, salvo que se decida esperar 10+ días por la plata para bajar la comisión.

---

## 6. Apple Developer Program

$99/año, costo conocido, sin investigación independiente — amortizado: **$8.25/mes**.

---

## Tabla resumen — costo combinado estimado por escala

Supuestos: Supabase Pro ($25/mes, fijo — necesario para no pausarse, ver sección 1) + Vercel Pro ($20/mes, fijo — necesario por la restricción de uso comercial de Hobby, ver sección 2) + IA (escenario realista, 15% fallback a Claude) + Apple amortizado ($8.25/mes). MercadoPago se muestra aparte como % porque es proporcional a los ingresos, no un costo fijo mensual.

| | 10 usuarios | 50 usuarios | 200 usuarios |
|---|---:|---:|---:|
| Supabase Pro | $25.00 | $25.00 | $25.00 |
| Vercel Pro | $20.00 | $20.00 | $20.00 |
| IA (Gemini + Claude fallback) | $0.18 | $0.90 | $3.60 |
| Apple Developer (amortizado) | $8.25 | $8.25 | $8.25 |
| **Total costo fijo mensual** | **≈ $53.4** | **≈ $54.2** | **≈ $56.9** |
| **Piso por usuario/mes** (solo costos fijos, sin margen) | **≈ $5.34** | **≈ $1.08** | **≈ $0.28** |
| + Comisión MercadoPago sobre el precio cobrado | ~7.6% del precio (acreditación instantánea) | igual | igual |

**Lectura clave:** a esta escala (10-200 usuarios), los costos son casi todos **fijos** (Supabase + Vercel + Apple ≈ $53/mes) y la IA es marginal. Eso significa que el "piso" por usuario cae fuerte con la escala — de ~$5.34/usuario a 10 usuarios a ~$0.28/usuario a 200. El verdadero piso de precio no está determinado por el costo marginal por usuario sino por: (a) cuántos usuarios pagos se necesitan para cubrir los ~$53/mes fijos, y (b) la comisión de MercadoPago (~7.6%) que se resta de cualquier precio de venta antes de ver margen real. Vercel/Supabase Pro se vuelven obligatorios desde el usuario #1 por términos de servicio (uso comercial) y disponibilidad (no-pausado), no por volumen — así que no hay un "umbral" de usuarios que dispare la migración: ya están activos desde que se lanza el cobro.

---

## Fuentes citadas

- Supabase pricing: https://supabase.com/pricing (2026-09-23)
- Supabase free project pausing: https://supabase.com/docs/guides/platform/free-project-pausing (2026-09-23)
- Vercel pricing: https://vercel.com/pricing (2026-09-23)
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing (2026-09-23)
- Gemini API rate limits (no publica cifras exactas por modelo): https://ai.google.dev/gemini-api/docs/rate-limits (2026-09-23)
- Gemini token counting (imágenes): https://ai.google.dev/gemini-api/docs/tokens (2026-09-23)
- Gemini 3.6 Flash model page: https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash (2026-09-23)
- Claude/Anthropic API pricing: https://claude.com/pricing (redirect desde anthropic.com/pricing) (2026-09-23)
- MercadoPago comisiones checkout: https://www.mercadopago.com.ar/herramientas-para-vender/check-out (2026-09-23)
- Código fuente del repo (modelo Gemini y Claude usados): `lib/geminiClient.ts:60`, `app/api/parse-nutrition-label/route.ts:28`, `app/api/parse-meal/route.ts:31`, `app/api/parse-shopping/route.ts:60`, `app/api/review-inventory/route.ts:42`
