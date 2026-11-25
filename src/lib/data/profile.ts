import type { AppRole, Tables } from "@/lib/database";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { invalid, SessionExpiredError } from "./errors";

export type Account = { user: { id: string; email?: string }; role: AppRole; profile: Tables<"profiles"> };

export async function readAccount(signal?: AbortSignal): Promise<Account | null> {
  const response = await fetch("/api/backend/account", { cache: "no-store", signal });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Account unavailable");
  return response.json();
}

export async function requireUser() {
  const client = createBrowserSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (error.status === 401 || error.status === 403 || error.name === "AuthSessionMissingError") throw new SessionExpiredError();
    throw error;
  }
  if (!data.user) throw new SessionExpiredError();
  return { client, user: data.user };
}

export async function readProfileCatalog() {
  const client = createBrowserSupabaseClient();
  const [universities, programs, groups] = await Promise.all([
    client.from("universities").select("*").order("name"),
    client.from("programs").select("*"),
    client.from("study_groups").select("*").order("name"),
  ]);
  if (universities.error) throw universities.error;
  if (programs.error) throw programs.error;
  if (groups.error) throw groups.error;
  return { universities: universities.data, programs: programs.data, groups: groups.data };
}
export type ProfileCatalog = Awaited<ReturnType<typeof readProfileCatalog>>;

export async function saveProfile(firstName: string, lastName: string, universityId: string, groupId: string) {
  const first_name = firstName.trim(), last_name = lastName.trim();
  if (!first_name || !last_name || first_name.length > 60 || last_name.length > 60) invalid("Укажите имя и фамилию длиной до 60 символов.");
  const { client, user } = await requireUser();
  const catalog = await readProfileCatalog();
  const group = catalog.groups.find((item) => item.id === groupId);
  if (!group || !catalog.programs.some((item) => item.id === group.program_id && item.university_id === universityId)) invalid("Группа должна принадлежать выбранному вузу.");
  const result = await client.from("profiles").update({ first_name, last_name, group_id: groupId }).eq("id", user.id).select("*").single();
  if (result.error) throw result.error;
  return result.data;
}
