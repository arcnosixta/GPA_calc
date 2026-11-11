"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { formatCalendarRange, validateCalendarTerms, type CalendarRange, type CatalogAcademicCalendar } from "@/lib/catalog-calendars";
import { getManagedUniversityIds, updateAcademicCalendar, type DemoCatalog } from "@/lib/demo-catalog";
import type { DemoSession } from "@/lib/demo-session";

const termNames = { autumn: "Осенний семестр", spring: "Весенний семестр" };
const rangeNames = { period: "Период семестра", rk1: "РК1", rk2: "РК2" };
const rangeKeys = ["period", "rk1", "rk2"] as const;

export function CalendarManager({ catalog, session }: { catalog: DemoCatalog; session: DemoSession }) {
  const [chosenUniversity, setUniversity] = useState("");
  const [academicYear, setYear] = useState("2026-2027");
  const [chosenCalendar, setCalendar] = useState("");
  const managedIds = getManagedUniversityIds(session, catalog);
  const universities = catalog.universities.filter((university) => managedIds.includes(university.id));
  const university = universities.find((item) => item.id === chosenUniversity)
    ?? universities.find((item) => item.id === "esil") ?? universities[0];
  const years = [...new Set(["2025-2026", "2026-2027", ...catalog.academicCalendars.map((item) => item.academicYear)])].sort();
  const calendars = catalog.academicCalendars.filter((item) => item.universityId === university?.id && item.academicYear === academicYear);
  const selected = calendars.find((item) => item.id === chosenCalendar) ?? calendars[0];

  return <section aria-labelledby="academic-calendar-heading" className="min-w-0 space-y-4">
    <div className="space-y-2">
      <h2 id="academic-calendar-heading" className="text-xl font-semibold">Академический календарь</h2>
      <p className="text-sm leading-6 text-muted">Сроки зависят от вуза, учебного года и курса. Здесь доступны вузы вашей демороли. Правки сохраняются локально в этом браузере.</p>
    </div>
    {!university ? <EmptyState title="Нет доступных вузов" description="Для этой демороли не назначена область управления календарями." /> : <>
      <Card className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label="Вуз календаря" htmlFor="calendar-university">
          <Select id="calendar-university" className="min-w-0" value={university.id}
            onChange={(event) => { setUniversity(event.target.value); setCalendar(""); }}>
            {universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </Field>
        <Field label="Учебный год" htmlFor="calendar-year">
          <Select id="calendar-year" value={academicYear} onChange={(event) => { setYear(event.target.value); setCalendar(""); }}>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </Select>
        </Field>
        {calendars.length > 1 && <div className="sm:col-span-2">
          <Field label="Программа или курс" htmlFor="calendar-record">
            <Select id="calendar-record" value={selected.id} onChange={(event) => setCalendar(event.target.value)}>
              {calendars.map((item) => <option key={item.id} value={item.id}>{item.scope}</option>)}
            </Select>
          </Field>
        </div>}
      </Card>
      {selected ? <CalendarDetails key={selected.id} calendar={selected} universityName={university.name} catalog={catalog} session={session} />
        : <EmptyState title="Календарь не опубликован" description={`В каталоге пока нет проверенной записи: ${university.name}, ${academicYear}. Сроки других вузов и годов сюда не переносятся.`} />}
    </>}
  </section>;
}

function CalendarDetails({ calendar, universityName, catalog, session }: {
  calendar: CatalogAcademicCalendar; universityName: string; catalog: DemoCatalog; session: DemoSession;
}) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const source = catalog.academicSources.find((item) => item.id === calendar.sourceId);
  const status = calendar.status === "official" ? "Официальный календарь"
    : calendar.status === "demo" ? "Демонстрационный пример" : "Локальная редакция";

  function finish(message: string) {
    setEditing(false);
    setMessage(message);
    requestAnimationFrame(() => document.getElementById("calendar-edit")?.focus());
  }

  return <Card className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-2">
        <h3 className="wrap-anywhere text-lg font-semibold">{universityName} · {calendar.academicYear}</h3>
        <p className="wrap-anywhere text-sm leading-6 text-muted">{calendar.scope}</p>
      </div>
      <Badge variant="outline">{status}</Badge>
    </div>
    {calendar.status === "local" && <p className="text-sm leading-6 text-muted">Это локальные правки пользователя. Они не подтверждены вузом; ссылка ниже ведёт на исходный документ, если он указан.</p>}
    {!source && <p className="text-sm leading-6 text-muted">Расписание демонстрационное, сроки служат ориентиром. Официальный источник для этой записи не указан.</p>}
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {calendar.terms.map((term) => <div key={term.id} className="min-w-0 rounded-xl border border-border p-4">
        <h4 className="mb-4 font-semibold">{termNames[term.season]}</h4>
        <dl className="space-y-4 text-sm">
          {rangeKeys.map((key) => <div key={key} className="space-y-1">
            <dt className="text-muted">{rangeNames[key]}</dt>
            <dd className="wrap-anywhere font-medium">{formatCalendarRange(term[key])}</dd>
          </div>)}
        </dl>
      </div>)}
    </div>
    {source && <div className="space-y-2 text-sm leading-6">
      <a href={source.url} target="_blank" rel="noreferrer" className="wrap-anywhere underline underline-offset-4">{source.title} (новая вкладка)</a>
      <p className="text-muted">Область источника: {source.scope}</p>
      <p className="text-muted">Учебный год источника: {source.academicYear}.</p>
      <p className="text-muted">Дата сверки: {source.checkedAt.split("-").reverse().join(".")}.</p>
      {source.note && <p className="text-muted">{source.note}</p>}
    </div>}
    {!editing && <Button id="calendar-edit" variant="secondary" onClick={() => {
      setEditing(true);
      setMessage("");
      requestAnimationFrame(() => document.getElementById("calendar-scope")?.focus());
    }}>Изменить локально</Button>}
    {editing && <CalendarEditor calendar={calendar} session={session} onClose={finish} />}
    <p role="status" className="text-sm leading-6 text-muted">{message}</p>
  </Card>;
}

function CalendarEditor({ calendar, session, onClose }: {
  calendar: CatalogAcademicCalendar; session: DemoSession; onClose: (message: string) => void;
}) {
  const [scope, setScope] = useState(calendar.scope);
  const [terms, setTerms] = useState(calendar.terms);
  const [error, setError] = useState("");

  function changeRange(termId: string, key: typeof rangeKeys[number], range: CalendarRange) {
    setError("");
    setTerms(terms.map((term) => term.id === termId ? { ...term, [key]: range } : term));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateCalendarTerms(terms);
    if (validationError) {
      setError(validationError);
      requestAnimationFrame(() => document.getElementById("calendar-form-error")?.focus());
      return;
    }
    const result = updateAcademicCalendar(session, calendar.id, { scope: scope.trim(), terms });
    if (result.ok) onClose("Календарь изменён локально. При доступном хранилище браузера правки сохранятся после перезагрузки.");
    else {
      setError(result.error ?? "Не удалось изменить календарь.");
      requestAnimationFrame(() => document.getElementById("calendar-form-error")?.focus());
    }
  }

  return <form onSubmit={submit} className="space-y-6 border-t border-border pt-6">
    <h4 className="font-semibold">Локальное редактирование календаря</h4>
    <p className="text-sm leading-6 text-muted">Оставьте диапазон целиком, если источник задаёт несколько дней или недель. Для отсутствующих данных выберите «Срок не указан».</p>
    <Field label="Область применения: программа или курс" htmlFor="calendar-scope">
      <Input id="calendar-scope" value={scope} required maxLength={240}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "calendar-form-error" : undefined}
        onChange={(event) => { setScope(event.target.value); setError(""); }} />
    </Field>
    {terms.map((term) => <fieldset key={term.id} className="min-w-0 space-y-4 rounded-xl border border-border p-4">
      <legend className="px-2 font-semibold">{termNames[term.season]}</legend>
      {rangeKeys.map((key) => <RangeEditor key={key} id={`${term.season}-${key}`} label={rangeNames[key]} range={term[key]}
        error={error} onChange={(range) => changeRange(term.id, key, range)} />)}
    </fieldset>)}
    {error && <p id="calendar-form-error" role="alert" tabIndex={-1} className="text-sm font-semibold">{error}</p>}
    <div className="flex flex-wrap gap-4">
      <Button type="submit">Сохранить локально</Button>
      <Button variant="secondary" onClick={() => onClose("")}>Отмена</Button>
    </div>
  </form>;
}

function RangeEditor({ id, label, range, error, onChange }: {
  id: string; label: string; range: CalendarRange; error: string; onChange: (range: CalendarRange) => void;
}) {
  function setKind(kind: string) {
    onChange(kind === "dates" ? { kind: "dates", start: "", end: "" }
      : kind === "weeks" ? { kind: "weeks", start: 1, end: 1 } : null);
  }

  function setValue(key: "start" | "end", value: string) {
    if (range?.kind === "dates") onChange({ ...range, [key]: value });
    if (range?.kind === "weeks") onChange({ ...range, [key]: Number(value) });
  }

  return <fieldset className="min-w-0 space-y-4">
    <legend className="mb-2 text-sm font-medium">{label}</legend>
    <Field label={`${label}: формат срока`} htmlFor={`${id}-kind`}>
      <Select id={`${id}-kind`} value={range?.kind ?? "missing"} onChange={(event) => setKind(event.target.value)}
        aria-describedby={error ? "calendar-form-error" : undefined}>
        <option value="dates">Даты</option><option value="weeks">Недели семестра</option><option value="missing">Срок не указан</option>
      </Select>
    </Field>
    {range && <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {(["start", "end"] as const).map((key) => <Field key={key} label={`${label}: ${key === "start" ? "начало" : "конец"}`} htmlFor={`${id}-${key}`}>
        <Input id={`${id}-${key}`} type={range.kind === "dates" ? "date" : "number"}
          className="min-w-0 max-w-full" required value={range[key]}
          min={range.kind === "weeks" ? 1 : undefined} max={range.kind === "weeks" ? 53 : undefined}
          step={range.kind === "weeks" ? 1 : undefined}
          onChange={(event) => setValue(key, event.target.value)}
          aria-invalid={Boolean(error)} aria-describedby={error ? "calendar-form-error" : undefined} />
      </Field>)}
    </div>}
  </fieldset>;
}
