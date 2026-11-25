import { getCurrentAccount } from "@/lib/supabase/account";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!isSupabaseConfigured()) return Response.json({ error: "backend_unconfigured" }, { status: 503, headers });
  try {
    const account = await getCurrentAccount();
    if (!account) return Response.json({ error: "unauthenticated" }, { status: 401, headers });
    return Response.json({ user: { id: account.user.id, email: account.user.email }, role: account.role, profile: account.profile }, { headers });
  } catch {
    return Response.json({ error: "account_unavailable" }, { status: 503, headers });
  }
}
