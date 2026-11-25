import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  await connection();
  if (!isSupabaseConfigured()) {
    return Response.json({ status: "unconfigured" }, { status: 503, headers });
  }
  try {
    const { url, publishableKey } = getSupabaseConfig();
    const supabase = createClient<Database>(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }) },
    });
    const { data, error } = await supabase.rpc("backend_health");
    if (error || data !== "scholarpath-v1") {
      return Response.json({ status: "unavailable" }, { status: 503, headers });
    }
    return Response.json({ status: "ok", database: "postgresql", schema: data }, { headers });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
