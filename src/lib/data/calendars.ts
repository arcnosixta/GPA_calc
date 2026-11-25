import type { Tables } from "@/lib/database";
import { validateCalendarTerms, type CalendarTerm } from "@/lib/catalog-calendars";
import { invalid } from "./errors";
import { requireUser } from "./profile";
import { readCalendars, validateYear } from "./student";

// Управление и студенческий экран читают один и тот же справочник.
export { readCalendars };
export type CalendarData = Awaited<ReturnType<typeof readCalendars>>;
export type CalendarMetadata = Pick<Tables<"academic_calendars">, "scope" | "source_id" | "status">;
export type SourceFields = Pick<Tables<"academic_sources">, "title" | "url" | "scope" | "checked_at" | "note">;

export function calendarTerm(row: Tables<"calendar_terms">): CalendarTerm {
  const term = { id: row.id, season: row.season, period: row.period, rk1: row.rk1, rk2: row.rk2 } as CalendarTerm;
  // Существующий валидатор проверяет пару; пустой второй семестр не сохраняется.
  const other: CalendarTerm = { id: `${row.id}-validation`, season: row.season === "autumn" ? "spring" : "autumn", period: null, rk1: null, rk2: null };
  const error = validateCalendarTerms([term, other]);
  if (error) invalid(error);
  return term;
}

export async function saveCalendarTerm(row: Tables<"calendar_terms">, year: string, draft: CalendarTerm) {
  validateYear(year);
  const term = calendarTerm({ ...row, period: draft.period, rk1: draft.rk1, rk2: draft.rk2 });
  for (const range of [term.period, term.rk1, term.rk2]) {
    if (range?.kind === "dates" && (range.start < `${year.slice(0, 4)}-01-01` || range.end > `${year.slice(5)}-12-31`)) {
      invalid("Даты должны относиться к выбранному учебному году.");
    }
  }
  const { client } = await requireUser();
  // Одна строка содержит период и оба РК: они обновляются одной операцией.
  const result = await client.from("calendar_terms").update({ period: term.period, rk1: term.rk1, rk2: term.rk2 })
    .eq("id", row.id).eq("calendar_id", row.calendar_id).select("*").single();
  if (result.error) throw result.error;
  if (!result.data || result.data.id !== row.id) invalid("Сохранение семестра не подтверждено. Перезагрузите календарь.");
  return result.data;
}

export async function saveCalendarMetadata(id: string, fields: CalendarMetadata) {
  const scope = fields.scope.trim();
  if (!scope || scope.length > 240) invalid("Укажите область применения длиной до 240 символов.");
  if (!["official", "demo", "local"].includes(fields.status)) invalid("Выберите статус календаря.");
  if (fields.status === "official" && !fields.source_id) invalid("Для официального календаря выберите источник.");
  const { client } = await requireUser();
  const result = await client.from("academic_calendars").update({ scope, source_id: fields.source_id || null, status: fields.status })
    .eq("id", id).select("*").single();
  if (result.error) throw result.error;
  if (!result.data || result.data.id !== id) invalid("Сохранение описания не подтверждено. Перезагрузите календарь.");
  return result.data;
}

export async function saveCalendarSource(id: string, fields: SourceFields) {
  const title = fields.title.trim(), scope = fields.scope.trim(), url = fields.url.trim();
  if (!title || title.length > 240 || !scope || scope.length > 240) invalid("Название и область источника должны содержать от 1 до 240 символов.");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !parsed.hostname || /\s/.test(url)) invalid("Укажите прямую HTTPS-ссылку на источник.");
  } catch { invalid("Укажите прямую HTTPS-ссылку на источник."); }
  const date = new Date(`${fields.checked_at}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.checked_at) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== fields.checked_at) invalid("Укажите существующую дату сверки источника.");
  const { client } = await requireUser();
  const result = await client.from("academic_sources").update({ title, scope, url, checked_at: fields.checked_at, note: fields.note.trim() })
    .eq("id", id).select("*").single();
  if (result.error) throw result.error;
  if (!result.data || result.data.id !== id) invalid("Сохранение источника не подтверждено. Перезагрузите календарь.");
  return result.data;
}
