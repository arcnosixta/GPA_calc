import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.has("error")) {
    const response = NextResponse.redirect(new URL("/login?error=oauth", request.url));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  const next = params.get("next") === "/reset-password" || params.get("type") === "recovery" ? "/reset-password" : "/dashboard";
  const failure = new URL(next === "/reset-password" ? "/forgot-password" : "/verify-email", request.url);
  failure.searchParams.set("error", "expired");
  try {
    const client = await createServerSupabaseClient();
    const code = params.get("code");
    const token_hash = params.get("token_hash");
    const type = params.get("type");
    const result = code ? await client.auth.exchangeCodeForSession(code)
      : token_hash && (type === "signup" || type === "recovery" || type === "email")
        ? await client.auth.verifyOtp({ token_hash, type }) : null;
    if (result && !result.error) {
      const destination = type === "recovery" ? "/reset-password" : next;
      const response = NextResponse.redirect(new URL(destination, request.url));
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
    if (result?.error && (result.error.name === "AuthRetryableFetchError" || (result.error.status ?? 0) >= 500)) failure.searchParams.set("error", "unavailable");
  } catch { failure.searchParams.set("error", "unavailable"); }
  const response = NextResponse.redirect(failure);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
