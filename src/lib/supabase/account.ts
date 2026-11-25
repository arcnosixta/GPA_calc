import "server-only";

import type { User } from "@supabase/supabase-js";
import type { AppRole, Tables } from "@/lib/database";
import { createServerSupabaseClient } from "./server";

export type CurrentAccount = { user: User; role: AppRole; profile: Tables<"profiles"> };

export async function getCurrentAccount(): Promise<CurrentAccount | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    if (authError.name === "AuthSessionMissingError" || authError.status === 401 || authError.status === 403) return null;
    throw authError;
  }
  if (!user) return null;

  const [profile, membership] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
  ]);
  if (profile.error) throw profile.error;
  if (membership.error) throw membership.error;
  return { user, profile: profile.data, role: membership.data.role };
}
