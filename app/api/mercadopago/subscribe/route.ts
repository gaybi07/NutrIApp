import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSubscription, PaidPlan } from "@/lib/mercadopago";

const VALID_PLANS: PaidPlan[] = ["premium", "autoentreno", "premium_plus"];

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { plan } = await request.json();
  if (!VALID_PLANS.includes(plan)) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  if (!user.email) return NextResponse.json({ error: "Tu cuenta no tiene email -- no se puede armar el cobro." }, { status: 400 });

  try {
    const { preapprovalId, initPoint } = await createSubscription({ userId: user.id, email: user.email, plan });
    // Fila propia (RLS: user_id = auth.uid()) -- el estado real (pending ->
    // authorized) lo actualiza el webhook, que corre con el service role.
    const { error } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      plan,
      mp_preapproval_id: preapprovalId,
      status: "pending",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ initPoint });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo armar el cobro." }, { status: 500 });
  }
}
