import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { WebhookSignatureValidator } from "mercadopago";
import { getSubscription } from "@/lib/mercadopago";
import { ClientPlan } from "@/lib/types";

/** MercadoPago llama esta ruta sin ninguna sesión de usuario -- necesita el
 * service role (bypassa RLS) para poder actualizar la suscripción y el plan
 * de CUALQUIER usuario, no solo el propio. Nunca exponer este cliente a
 * código que corra en el browser. */
function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Webhooks de Suscripciones (Preapproval) -- ver Contexto del plan de
 * Pagos: sin split todavía, esto solo sincroniza `user_settings.plan` con
 * lo que MercadoPago confirma. Topics que importan acá:
 * - subscription_preapproval: la suscripción pasó a authorized/paused/cancelled.
 * - subscription_authorized_payment: un cobro mensual puntual (no se actúa
 *   sobre esto todavía -- MercadoPago reintenta solo los rechazados).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const topic = body?.type || request.nextUrl.searchParams.get("topic");
  const dataId = body?.data?.id || request.nextUrl.searchParams.get("id");

  // Sin secreto configurado todavía (primera puesta en marcha, antes de que
  // el usuario complete "Tus integraciones" > Webhooks) -- se avisa fuerte
  // en el log en vez de fallar silenciosamente, pero no se bloquea el flujo
  // para no trabar las pruebas iniciales.
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"),
        dataId,
        secret,
      });
    } catch (e) {
      console.error("Webhook de MercadoPago con firma inválida", e);
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
  } else {
    console.warn("MERCADOPAGO_WEBHOOK_SECRET no configurado -- validación de firma salteada.");
  }

  if (topic !== "subscription_preapproval" || !dataId) {
    // subscription_authorized_payment y cualquier otro topic: se reconoce
    // (200) pero no hace falta actuar todavía en esta fase.
    return NextResponse.json({ ok: true });
  }

  try {
    const preapproval = await getSubscription(dataId);
    const userId = preapproval.external_reference;
    const status = preapproval.status; // "authorized" | "paused" | "cancelled" | "pending"
    if (!userId || !status) return NextResponse.json({ ok: true });

    const supabase = serviceClient();
    await supabase.from("subscriptions").update({ status, updated_at: new Date().toISOString() }).eq("mp_preapproval_id", dataId);

    if (status === "authorized") {
      // Autorizada de verdad -- recién ahora se le da el plan. El nombre del
      // plan viaja en `reason` (ver createSubscription) o se puede resolver
      // desde la propia fila de `subscriptions` ya insertada por /subscribe.
      const { data: sub } = await supabase.from("subscriptions").select("plan").eq("mp_preapproval_id", dataId).maybeSingle();
      if (sub?.plan) {
        await supabase.from("user_settings").update({ plan: sub.plan as ClientPlan }).eq("user_id", userId);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error procesando webhook de MercadoPago", e);
    // 200 igual -- MercadoPago reintenta con backoff si devolvemos error, y
    // un error nuestro (ej. Supabase caído un instante) no debería generar
    // una tormenta de reintentos infinita por un solo evento.
    return NextResponse.json({ ok: true });
  }
}
