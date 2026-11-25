import type { Tables } from "@/lib/database";
import { dataErrorMessage, invalid } from "./errors";
import { requireUser, type Account } from "./profile";

export type CatalogData = {
  universities: Tables<"universities">[];
  programs: Tables<"programs">[];
  groups: Tables<"study_groups">[];
  subjects: Tables<"subjects">[];
  semesters: Tables<"semesters">[];
  plans: Tables<"study_plan_items">[];
  assignments: Tables<"moderator_groups">[];
};

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

export function managementErrorMessage(error: unknown) {
  const value = error as { code?: string; message?: string; status?: number } | null;
  if (value?.code === "23505") return "Такая запись или код уже существуют. Обновите список и проверьте введённые данные.";
  if (value?.code === "23503") return "Связанная запись недоступна или используется другими данными. Обновите список и проверьте выбранный вуз, направление и группу.";
  if (["23514", "22P02", "22003", "22007", "22008"].includes(value?.code ?? "")) return "Значения не прошли проверку базы. Проверьте поля формы и доступность выбранного семестра.";
  if (value?.code === "PGRST116") return "Запись не найдена или недоступна для изменения. Сохранение не подтверждено; обновите список.";
  if (value?.status === 0 || value?.code === "NETWORK" || value?.message?.includes("Failed to fetch")) return "Нет соединения с базой. Проверьте сеть и повторите запрос. Сохранение пока не подтверждено.";
  return dataErrorMessage(error);
}

export async function readCatalog(): Promise<CatalogData> {
  const { client } = await requireUser();
  const [universities, programs, groups, subjects, semesters, plans, assignments] = await Promise.all([
    readAll((start, end) => client.from("universities").select("*").order("name").order("id").range(start, end)),
    readAll((start, end) => client.from("programs").select("*").order("name").order("id").range(start, end)),
    readAll((start, end) => client.from("study_groups").select("*").order("name").order("id").range(start, end)),
    readAll((start, end) => client.from("subjects").select("*").order("title").order("id").range(start, end)),
    readAll((start, end) => client.from("semesters").select("*").order("number").range(start, end)),
    readAll((start, end) => client.from("study_plan_items").select("*").order("group_id").order("semester").order("subject_id").range(start, end)),
    readAll((start, end) => client.from("moderator_groups").select("*").order("moderator_id").order("group_id").range(start, end)),
  ]);
  return {
    universities, programs, groups, subjects, semesters, plans, assignments,
  };
}

// Эти проверки управляют видимостью действий. Права каждого запроса проверяет RLS базы.
export function canManageGroup(account: Account, catalog: CatalogData, id: string) {
  return account.role === "admin" || account.role === "moderator" && catalog.assignments.some((item) => item.moderator_id === account.user.id && item.group_id === id);
}

export function canManageUniversity(account: Account, catalog: CatalogData, id: string) {
  return account.role === "admin" || account.role === "moderator" && (
    catalog.universities.some((item) => item.id === id && item.created_by === account.user.id) ||
    catalog.groups.some((group) => canManageGroup(account, catalog, group.id) && catalog.programs.some((program) => program.id === group.program_id && program.university_id === id))
  );
}

export function canUseProgram(account: Account, catalog: CatalogData, id: string) {
  if (account.role === "admin") return true;
  const program = catalog.programs.find((item) => item.id === id);
  const university = catalog.universities.find((item) => item.id === program?.university_id);
  return account.role === "moderator" && Boolean(university && canManageUniversity(account, catalog, university.id) && (
    university.created_by === account.user.id || !catalog.groups.some((group) => group.program_id === id) ||
    catalog.groups.some((group) => group.program_id === id && canManageGroup(account, catalog, group.id))
  ));
}

export function canManageProgram(account: Account, catalog: CatalogData, id: string) {
  return account.role === "admin" || account.role === "moderator" && canUseProgram(account, catalog, id) &&
    !catalog.groups.some((group) => group.program_id === id && !canManageGroup(account, catalog, group.id));
}

export function canManageSubject(account: Account, catalog: CatalogData, id: string) {
  const subject = catalog.subjects.find((item) => item.id === id);
  return account.role === "admin" || account.role === "moderator" && Boolean(subject && canUseProgram(account, catalog, subject.program_id)) &&
    !catalog.plans.some((plan) => plan.subject_id === id && !canManageGroup(account, catalog, plan.group_id));
}

function title(value: string, max: number, label: string) {
  const text = value.trim();
  if (!text || text.length > max) invalid(`${label}: введите от 1 до ${max} символов.`);
  return text;
}

function identifier(value: string) {
  if (!value.trim()) invalid("Выберите связанную запись.");
  return value;
}

export async function createUniversity(name: string) {
  const payload = { name: title(name, 120, "Название вуза") };
  const { client, user } = await requireUser();
  const result = await client.from("universities").insert(payload).select("*").single();
  if (result.error?.code !== "23505") return confirmed(result);
  const existing = confirmed(await client.from("universities").select("*").eq("name", payload.name).single());
  if (existing.created_by !== user.id) throw result.error;
  return existing;
}

export async function saveUniversity(id: string, name: string) {
  const payload = { name: title(name, 120, "Название вуза") };
  const { client } = await requireUser();
  return confirmed(await client.from("universities").update(payload).eq("id", id).select("*").single());
}

export async function createProgram(university_id: string, name: string) {
  const payload = { university_id: identifier(university_id), name: title(name, 120, "Название направления") };
  const { client } = await requireUser();
  const result = await client.from("programs").insert(payload).select("*").single();
  if (result.error?.code !== "23505") return confirmed(result);
  return confirmed(await client.from("programs").select("*").eq("university_id", university_id).eq("name", payload.name).single());
}

export async function saveProgram(id: string, name: string) {
  const { client } = await requireUser();
  return confirmed(await client.from("programs").update({ name: title(name, 120, "Название направления") }).eq("id", id).select("*").single());
}

export async function createGroup(program_id: string, name: string, year: number) {
  if (!Number.isInteger(year) || year < 1 || year > 6) invalid("Курс должен быть целым числом от 1 до 6.");
  const payload = { program_id: identifier(program_id), name: title(name, 60, "Название группы"), year };
  const { client } = await requireUser();
  const result = await client.from("study_groups").insert(payload).select("*").single();
  if (result.error?.code !== "23505") return confirmed(result);
  const existing = confirmed(await client.from("study_groups").select("*").eq("program_id", program_id).eq("name", payload.name).single());
  if (existing.year !== year) throw result.error;
  return existing;
}

export async function saveGroup(id: string, name: string, year: number) {
  if (!Number.isInteger(year) || year < 1 || year > 6) invalid("Курс должен быть целым числом от 1 до 6.");
  const { client } = await requireUser();
  return confirmed(await client.from("study_groups").update({ name: title(name, 60, "Название группы"), year }).eq("id", id).select("*").single());
}

export type SubjectFields = { code: string; title: string; credits: number };
function subjectFields(fields: SubjectFields) {
  if (!Number.isInteger(fields.credits) || fields.credits < 1 || fields.credits > 30) invalid("Количество кредитов — целое число от 1 до 30.");
  if (fields.code.trim().length > 20) invalid("Код предмета содержит не более 20 символов.");
  return { code: fields.code.trim(), title: title(fields.title, 120, "Название предмета"), credits: fields.credits };
}

export async function createSubject(program_id: string, fields: SubjectFields) {
  const payload = { program_id: identifier(program_id), ...subjectFields(fields) };
  if (!payload.code) invalid("Укажите код нового предмета, чтобы повторное сохранение не создало дубликат.");
  const { client } = await requireUser();
  const result = await client.from("subjects").insert(payload).select("*").single();
  if (result.error?.code !== "23505") return confirmed(result);
  // Поиск без ilike: символы % и _ в коде не должны становиться шаблоном.
  const candidates = await readAll((start, end) => client.from("subjects").select("*").eq("program_id", program_id).is("archived_at", null).order("id").range(start, end));
  const existing = candidates.find((item) => item.code.toLowerCase() === payload.code.toLowerCase());
  if (!existing || existing.title !== payload.title || existing.credits !== payload.credits) throw result.error;
  return existing;
}

export async function saveSubject(id: string, fields: SubjectFields) {
  const payload = subjectFields(fields);
  const { client } = await requireUser();
  return confirmed(await client.from("subjects").update(payload).eq("id", id).select("*").single());
}

export async function archiveSubject(id: string) {
  const { client } = await requireUser();
  return confirmed(await client.from("subjects").update({ archived_at: new Date().toISOString() }).eq("id", id).select("*").single());
}

export async function saveSemester(number: number, fields: { title: string; is_active: boolean }) {
  const payload = { title: title(fields.title, 60, "Название семестра"), is_active: fields.is_active };
  if (!Number.isInteger(number) || number < 1 || number > 8) invalid("Номер семестра — от 1 до 8.");
  const { client } = await requireUser();
  return confirmed(await client.from("semesters").update(payload).eq("number", number).select("*").single());
}

export async function createSemester(fields: { number: number; title: string; is_active: boolean }) {
  const payload = { number: fields.number, title: title(fields.title, 60, "Название семестра"), is_active: fields.is_active };
  if (!Number.isInteger(payload.number) || payload.number < 1 || payload.number > 8) invalid("Номер семестра — от 1 до 8.");
  const { client } = await requireUser();
  const result = await client.from("semesters").insert(payload).select("*").single();
  if (result.error?.code !== "23505") return confirmed(result);
  const existing = confirmed(await client.from("semesters").select("*").eq("number", payload.number).single());
  if (existing.title !== payload.title || existing.is_active !== payload.is_active) throw result.error;
  return existing;
}
