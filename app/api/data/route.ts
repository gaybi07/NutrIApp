import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DayEntry, Settings } from "@/lib/types";

const DEFAULT_SETTINGS: Settings = { goal: 2400, tdeeFallback: 3200, weeklyWeights: {} };

function toDay(row: Record<string, unknown>): DayEntry {
  return {
    fecha: String(row.fecha),
    desK: Number(row.des_k),
    desP: Number(row.des_p),
    desC: row.des_c != null ? Number(row.des_c) : undefined,
    desG: row.des_g != null ? Number(row.des_g) : undefined,
    almK: Number(row.alm_k),
    almP: Number(row.alm_p),
    almC: row.alm_c != null ? Number(row.alm_c) : undefined,
    almG: row.alm_g != null ? Number(row.alm_g) : undefined,
    merK: Number(row.mer_k),
    merP: Number(row.mer_p),
    merC: row.mer_c != null ? Number(row.mer_c) : undefined,
    merG: row.mer_g != null ? Number(row.mer_g) : undefined,
    cenK: Number(row.cen_k),
    cenP: Number(row.cen_p),
    cenC: row.cen_c != null ? Number(row.cen_c) : undefined,
    cenG: row.cen_g != null ? Number(row.cen_g) : undefined,
    pasos: Number(row.pasos),
    entreno: Boolean(row.entreno),
    pesoKg: row.peso_kg ? Number(row.peso_kg) : undefined,
    suenoHoras: row.sueno_horas != null ? Number(row.sueno_horas) : undefined,
    entrenoMinutos: row.entreno_minutos ? Number(row.entreno_minutos) : undefined,
    entrenoIntensidad: row.entreno_intensidad as DayEntry["entrenoIntensidad"],
    entrenamientos: (row.entrenamientos as DayEntry["entrenamientos"]) || undefined,
  };
}

function toDayRow(day: DayEntry, userId: string) {
  return {
    user_id: userId,
    fecha: day.fecha,
    des_k: day.desK,
    des_p: day.desP,
    des_c: day.desC || 0,
    des_g: day.desG || 0,
    alm_k: day.almK,
    alm_p: day.almP,
    alm_c: day.almC || 0,
    alm_g: day.almG || 0,
    mer_k: day.merK,
    mer_p: day.merP,
    mer_c: day.merC || 0,
    mer_g: day.merG || 0,
    cen_k: day.cenK,
    cen_p: day.cenP,
    cen_c: day.cenC || 0,
    cen_g: day.cenG || 0,
    pasos: day.pasos,
    entreno: day.entreno,
    peso_kg: day.pesoKg || null,
    sueno_horas: day.suenoHoras || null,
    entreno_minutos: day.entrenoMinutos || null,
    entreno_intensidad: day.entrenoIntensidad || null,
    entrenamientos: day.entrenamientos || [],
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const [daysResult, settingsResult] = await Promise.all([
    supabase.from("days").select("*").order("fecha", { ascending: true }),
    supabase.from("user_settings").select("goal, tdee_fallback, weekly_weights, calculator_profile, tour_done").eq("user_id", user.id).maybeSingle(),
  ]);

  if (daysResult.error) return NextResponse.json({ error: daysResult.error.message }, { status: 500 });
  if (settingsResult.error) return NextResponse.json({ error: settingsResult.error.message }, { status: 500 });

  return NextResponse.json({
    days: (daysResult.data ?? []).map(toDay),
    settings: settingsResult.data
      ? {
          goal: settingsResult.data.goal,
          tdeeFallback: settingsResult.data.tdee_fallback,
          weeklyWeights: ((settingsResult.data as Record<string, unknown>).weekly_weights as Record<string, number>) || {},
          calculatorProfile: (settingsResult.data as Record<string, unknown>).calculator_profile || undefined,
          tourDone: Boolean((settingsResult.data as Record<string, unknown>).tour_done),
        }
      : DEFAULT_SETTINGS,
  });
}

export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  if (Array.isArray(body.days)) {
    const { error } = await supabase
      .from("days")
      .upsert(body.days.map((day: DayEntry) => toDayRow(day, user.id)));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.day) {
    const { error } = await supabase.from("days").upsert(toDayRow(body.day as DayEntry, user.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.settings) {
    const settings = body.settings as Settings;
    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      goal: settings.goal,
      tdee_fallback: settings.tdeeFallback,
      weekly_weights: settings.weeklyWeights || {},
      calculator_profile: settings.calculatorProfile || null,
      tour_done: settings.tourDone || false,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
