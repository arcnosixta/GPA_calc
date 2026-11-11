export type CalendarRange =
  | { kind: "dates"; start: string; end: string }
  | { kind: "weeks"; start: number; end: number }
  | null;

export type CalendarTerm = {
  id: string;
  season: "autumn" | "spring";
  period: CalendarRange;
  rk1: CalendarRange;
  rk2: CalendarRange;
};

export type CatalogAcademicCalendar = {
  id: string;
  universityId: string;
  academicYear: string;
  scope: string;
  status: "official" | "demo" | "local";
  sourceId: string | null;
  terms: CalendarTerm[];
};

export type AcademicSource = {
  id: string;
  title: string;
  url: string;
  checkedAt: string;
  academicYear: string;
  scope: string;
  note?: string;
};

export const calendarUniversity = { id: "esil", name: "ESIL University" };

const esilId = "esil-2026-2027-bachelor-2026";
const demoId = "central-2026-2027-example";
const esilScope = "Очный бакалавриат, приём 2026 года, срок обучения 4 года (1 курс).";

export const academicSources: AcademicSource[] = [{
  id: "esil-calendar-2026-2027",
  title: "ESIL University — академический календарь бакалавриата, страница 3",
  url: "https://esil.edu.kz/uploads/2026/09/akadem-kalendar-bakalavriat-2026-27-uch-god-rus.pdf#page=3",
  checkedAt: "2026-11-11",
  academicYear: "2026-2027",
  scope: esilScope,
  note: "Диапазоны сверены со страницей 3 официального PDF. Не распространяются на другие годы приёма и формы обучения.",
}];

export const initialAcademicCalendars: CatalogAcademicCalendar[] = [
  {
    id: esilId,
    universityId: calendarUniversity.id,
    academicYear: "2026-2027",
    scope: esilScope,
    status: "official",
    sourceId: academicSources[0].id,
    terms: [
      {
        id: `${esilId}-autumn`, season: "autumn",
        period: { kind: "dates", start: "2026-09-01", end: "2026-12-11" },
        rk1: { kind: "dates", start: "2026-10-19", end: "2026-10-23" },
        rk2: { kind: "dates", start: "2026-12-07", end: "2026-12-11" },
      },
      {
        id: `${esilId}-spring`, season: "spring",
        period: { kind: "dates", start: "2027-01-25", end: "2027-05-10" },
        rk1: { kind: "dates", start: "2027-03-16", end: "2027-03-20" },
        rk2: { kind: "dates", start: "2027-05-03", end: "2027-05-10" },
      },
    ],
  },
  {
    id: demoId,
    universityId: "central",
    academicYear: "2026-2027",
    scope: "Демонстрационный пример, не официальный календарь вуза.",
    status: "demo",
    sourceId: null,
    terms: [
      {
        id: `${demoId}-autumn`, season: "autumn", period: null,
        rk1: { kind: "weeks", start: 7, end: 7 },
        rk2: { kind: "weeks", start: 14, end: 14 },
      },
      {
        id: `${demoId}-spring`, season: "spring", period: null,
        rk1: { kind: "weeks", start: 7, end: 7 },
        rk2: { kind: "weeks", start: 14, end: 14 },
      },
    ],
  },
];

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isCalendarRange(value: unknown): value is CalendarRange {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const range = value as Exclude<CalendarRange, null>;
  if (range.kind === "dates") return isDate(range.start) && isDate(range.end) && range.start <= range.end;
  return range.kind === "weeks" && Number.isInteger(range.start) && Number.isInteger(range.end) &&
    range.start >= 1 && range.end <= 53 && range.start <= range.end;
}

function isCalendarTerm(value: unknown): value is CalendarTerm {
  if (!value || typeof value !== "object") return false;
  const term = value as CalendarTerm;
  return typeof term.id === "string" && Boolean(term.id.trim()) &&
    (term.season === "autumn" || term.season === "spring") &&
    isCalendarRange(term.period) && isCalendarRange(term.rk1) && isCalendarRange(term.rk2);
}

export function validateCalendarTerms(terms: CalendarTerm[]): string | null {
  if (!Array.isArray(terms) || terms.length !== 2 || !terms.every(isCalendarTerm)) {
    return "Нужны два семестра. Проверьте даты и целые номера недель от 1 до 53.";
  }
  if (!terms.some((term) => term.season === "autumn") || !terms.some((term) => term.season === "spring") ||
      terms[0].id === terms[1].id) return "Укажите осенний и весенний семестры с разными идентификаторами.";

  for (const term of terms) {
    const title = term.season === "autumn" ? "Осенний семестр" : "Весенний семестр";
    for (const control of [term.rk1, term.rk2]) {
      if (control && term.period && control.kind === term.period.kind &&
          (control.start < term.period.start || control.end > term.period.end)) {
        return `${title}: РК должен находиться внутри периода семестра.`;
      }
    }
    if (term.rk1 && term.rk2 && term.rk1.kind === term.rk2.kind && term.rk1.end >= term.rk2.start) {
      return `${title}: РК1 должен завершиться раньше начала РК2.`;
    }
  }
  return null;
}

export function isCatalogAcademicCalendar(value: unknown): value is CatalogAcademicCalendar {
  if (!value || typeof value !== "object") return false;
  const calendar = value as CatalogAcademicCalendar;
  if (typeof calendar.id !== "string" || !calendar.id.trim() ||
      typeof calendar.universityId !== "string" || !calendar.universityId.trim() ||
      typeof calendar.scope !== "string" || !calendar.scope.trim() || calendar.scope.length > 240 ||
      typeof calendar.academicYear !== "string" || !/^\d{4}-\d{4}$/.test(calendar.academicYear) ||
      !["official", "demo", "local"].includes(calendar.status) ||
      !(calendar.sourceId === null || (typeof calendar.sourceId === "string" && Boolean(calendar.sourceId.trim())))) return false;
  const [start, end] = calendar.academicYear.split("-").map(Number);
  return end === start + 1 && (calendar.status !== "official" || calendar.sourceId !== null) &&
    validateCalendarTerms(calendar.terms) === null;
}

export function formatCalendarRange(range: CalendarRange): string {
  if (!range) return "Срок не указан";
  if (range.kind === "weeks") return range.start === range.end ? `${range.start}-я неделя` : `Недели ${range.start}–${range.end}`;
  const start = range.start.split("-").reverse().join(".");
  const end = range.end.split("-").reverse().join(".");
  return range.start === range.end ? start : `${start} — ${end}`;
}
