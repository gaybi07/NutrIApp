import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as "email" | "recovery" | null;
  let error: string | null = null;

  if (code || tokenHash) {
    const supabase = await createSupabaseServerClient();
    if (code) {
      const result = await supabase.auth.exchangeCodeForSession(code);
      error = result.error?.message ?? null;
    } else if (tokenHash && type === "email") {
      const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
      error = result.error?.message ?? null;
    }
  }

  const destination = new URL("/", request.url);
  if (error) destination.searchParams.set("auth_error", error);
  return NextResponse.redirect(destination);
}
