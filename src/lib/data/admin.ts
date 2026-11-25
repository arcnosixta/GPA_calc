import type { Database } from "@/lib/database.types";
import { invalid, SessionExpiredError } from "./errors";
import { readAccount, requireUser } from "./profile";

function confirmed<T>(result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error) throw result.error;
  if (result.data == null) throw { code: "PGRST116" };
  return result.data;
}

async function readAll<T>(page: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 200) {
    const batch = confirmed(await page(start, start + 199));
    rows.push(...batch);
    if (batch.length < 200) return rows;
  }
}

// Роль проверяется серверным endpoint заново перед административным запросом.
async function requireAdmin() {
  const account = await readAccount();
  if (!account) throw new SessionExpiredError();
  if (account.role !== "admin") throw Object.assign(new Error("Требуется администратор."), { code: "42501" });
  const { client, user } = await requireUser();
  if (user.id !== account.user.id) throw new SessionExpiredError();
  return { client, user };
}

export async function readAdminData() {
  const { client } = await requireAdmin();
  const [profiles, roles, assignments, groups] = await Promise.all([
    readAll((start, end) => client.from("profiles").select("*").order("last_name").order("first_name").order("id").range(start, end)),
    readAll((start, end) => client.from("user_roles").select("*").order("user_id").range(start, end)),
    readAll((start, end) => client.from("moderator_groups").select("*").order("moderator_id").order("group_id").range(start, end)),
    readAll((start, end) => client.from("study_groups").select("*").order("name").order("id").range(start, end)),
  ]);
  return { profiles, roles, assignments, groups };
}
export type AdminData = Awaited<ReturnType<typeof readAdminData>>;

export async function setUserRole(targetUserId: string, role: "student" | "moderator") {
  if (!targetUserId || !["student", "moderator"].includes(role)) invalid("Выберите пользователя и разрешённую роль.");
  const { client, user } = await requireAdmin();
  if (targetUserId === user.id) invalid("Здесь нельзя менять собственную роль.");
  const current = confirmed(await client.from("user_roles").select("*").eq("user_id", targetUserId).single());
  if (current.user_id !== targetUserId) invalid("Пользователь не подтверждён. Обновите список.");
  if (current.role === "admin") invalid("Роль администратора здесь не изменяется.");
  const result = await client.rpc("admin_set_user_role", { target_user_id: targetUserId, new_role: role });
  if (result.error) throw result.error;
  const saved = confirmed(await client.from("user_roles").select("*").eq("user_id", targetUserId).single());
  if (saved.user_id !== targetUserId) invalid("Сохранение роли не подтверждено. Обновите список пользователей.");
  if (saved.role !== role) invalid("Роль изменилась другим запросом. Обновите список пользователей.");
  return saved;
}

export async function addModeratorGroup(moderatorId: string, groupId: string) {
  if (!moderatorId || !groupId) invalid("Выберите модератора и группу.");
  const { client } = await requireAdmin();
  const role = confirmed(await client.from("user_roles").select("role").eq("user_id", moderatorId).single());
  if (role.role !== "moderator") invalid("Сначала назначьте пользователю роль модератора.");
  const inserted = await client.from("moderator_groups").insert({ moderator_id: moderatorId, group_id: groupId }).select("*").single();
  // Повтор назначения возвращает существующую связь, не создавая дубль.
  const saved = confirmed(inserted.error?.code === "23505"
    ? await client.from("moderator_groups").select("*").eq("moderator_id", moderatorId).eq("group_id", groupId).single()
    : inserted);
  if (saved.moderator_id !== moderatorId || saved.group_id !== groupId) invalid("Назначение группы не подтверждено. Обновите список пользователей.");
  return saved;
}

export async function removeModeratorGroup(moderatorId: string, groupId: string) {
  if (!moderatorId || !groupId) invalid("Выберите назначенную группу.");
  const { client } = await requireAdmin();
  const result = await client.from("moderator_groups").delete().eq("moderator_id", moderatorId).eq("group_id", groupId).select("*");
  if (result.error) throw result.error;
  // Пустой DELETE сам по себе не подтверждает успех: проверяем роль и отсутствие связи.
  await requireAdmin();
  const remaining = await client.from("moderator_groups").select("*").eq("moderator_id", moderatorId).eq("group_id", groupId).maybeSingle();
  if (remaining.error) throw remaining.error;
  if (remaining.data) invalid("Назначение осталось в базе. Обновите список и повторите действие.");
}

export type ArchiveRecord = Database["public"]["Views"]["student_results"]["Row"];

export async function readOwnHistory(expectedUserId: string): Promise<ArchiveRecord[]> {
  const { client, user } = await requireUser();
  if (user.id !== expectedUserId) throw new SessionExpiredError();
  return readAll((start, end) => client.from("student_results").select("*").eq("student_id", user.id)
    .order("academic_year").order("semester").order("title").order("id").range(start, end));
}
