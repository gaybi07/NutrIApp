import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { ClientPlan, PLAN_PRICES_ARS } from "@/lib/types";

/** Server-only -- nunca importar este archivo desde un componente cliente
 * (usa MERCADOPAGO_ACCESS_TOKEN, que nunca debe llegar al browser). */
function client(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN en .env.local");
  return new MercadoPagoConfig({ accessToken });
}

export type PaidPlan = Exclude<ClientPlan, "basico">;

/**
 * Crea una suscripción (Preapproval) para UN plan pago -- sin split, 100% a
 * la cuenta de MercadoPago de la plataforma (ver Contexto del plan: no se
 * puede combinar Preapproval con application_fee). Devuelve el
 * `init_point` al que hay que redirigir al usuario para que autorice el
 * cobro recurrente.
 */
export async function createSubscription({
  userId,
  email,
  plan,
}: {
  userId: string;
  email: string;
  plan: PaidPlan;
}): Promise<{ preapprovalId: string; initPoint: string }> {
  const preApproval = new PreApproval(client());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await preApproval.create({
    body: {
      reason: `registro-app · ${PLAN_LABELS[plan]}`,
      external_reference: userId,
      payer_email: email,
      back_url: appUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PLAN_PRICES_ARS[plan],
        currency_id: "ARS",
      },
    },
  });
  if (!response.id || !response.init_point) {
    throw new Error("MercadoPago no devolvió init_point -- revisá las credenciales.");
  }
  return { preapprovalId: response.id, initPoint: response.init_point };
}

export async function getSubscription(preapprovalId: string) {
  const preApproval = new PreApproval(client());
  return preApproval.get({ id: preapprovalId });
}

export const PLAN_LABELS: Record<PaidPlan, string> = {
  premium: "Premium",
  autoentreno: "Autoentreno",
  premium_plus: "Premium+",
};
