# Costos operativos actuales/proyectados

Type: research
Status: resolved

## Question

Para fijar un piso de precio ("cubrir mis gastos" fue el pedido explícito del usuario), investigar:
- Costo actual/proyectado de Supabase (plan gratis vs. Pro — en qué momento este proyecto necesita pasar a pago, según uso de DB/almacenamiento/auth).
- Costo actual/proyectado de Vercel (plan gratis vs. Pro).
- Costo de las APIs de IA: Gemini (tiers gratis/pago, cuota) y Anthropic (Claude Sonnet, costo por uso — ya se usa `claude-sonnet-4-6` como fallback). Estimar costo mensual con distintos volúmenes de usuarios activos (ej. 10, 50, 200).
- Comisiones de MercadoPago sobre cada cobro (% que se lleva MercadoPago, separado de lo que se define como split a profesionales).
- Costo de una cuenta de Apple Developer (ya sabido: u$s99/año, fuera de este ticket pero anotarlo en la cuenta total si es útil para el número final).

Esto alimenta directamente a [Estructura de precios](04-estructura-precios.md).

## Answer

Investigación completa en [`research/03-costos-operativos.md`](../research/03-costos-operativos.md).

- **Supabase y Vercel son costo fijo obligatorio desde el día 1 de monetizar**, no una decisión de umbral de uso: el free tier de Supabase se auto-pausa a los 7 días de inactividad (inaceptable para un producto pago), y los términos del plan gratis de Vercel prohíben uso comercial. Supabase Pro ($25/mes) + Vercel Pro ($20/mes) ≈ **$45/mes fijo**, sin importar la escala.
- **La IA es un costo marginal, no el problema**: con ~5 llamadas de IA por usuario por semana, el costo estimado va de ~$0.18/mes (10 usuarios) a ~$3.60/mes (200 usuarios) — incluso en el peor caso (100% Claude, sin Gemini) llega a ~$23.80/mes con 200 usuarios.
- **MercadoPago cobra 6.29% + IVA** (~7.6% efectivo) por acreditación instantánea, bajando a 1.49%+IVA con acreditación a 35 días — esto es aparte del % que se le da a cada profesional.
- Costo fijo total combinado (Supabase+Vercel+Apple Developer amortizado) ≈ $53-57/mes → **cae fuerte por usuario con escala**: ~$5.34/usuario con 10 usuarios, ~$0.28/usuario con 200 usuarios, más el ~7.6% de MercadoPago sobre lo que se cobre.

**Para el ticket de precios**: con pocos usuarios (grupo cerrado inicial) el costo fijo por persona es alto — hay que precificar pensando en cubrir ese piso de ~$45-57/mes total, no en el costo marginal por usuario (que es casi irrelevante).
