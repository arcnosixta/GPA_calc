"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { formatCalendarRange, type CalendarRange, type CalendarTerm } from "@/lib/catalog-calendars";
import { calendarTerm, readCalendars, saveCalendarMetadata, saveCalendarSource, saveCalendarTerm, type CalendarData, type CalendarMetadata, type SourceFields } from "@/lib/data/calendars";
import { canManageUniversity, managementErrorMessage, type readCatalog } from "@/lib/data/catalog";
import type { Account } from "@/lib/data/profile";
import type { Tables } from "@/lib/database";

type Catalog = Awaited<ReturnType<typeof readCatalog>>;
const names = { autumn: "Осенний семестр", spring: "Весенний семестр" };
const rangeNames = { period: "Период семестра", rk1: "РК1", rk2: "РК2" };
const rangeKeys = ["period", "rk1", "rk2"] as const;

function sameRange(first: CalendarRange, second: CalendarRange) {
  if (first === null || second === null) return first === second;
  return first.kind === second.kind && first.start === second.start && first.end === second.end;
}

export function DatabaseCalendars({ account, catalog }: { account: Account; catalog: Catalog }) {
  const universities = catalog.universities.filter((item) => canManageUniversity(account, catalog, item.id));
  const [chosen, setChosen] = useState("");
  const university = universities.find((item) => item.id === chosen) ?? universities[0];
  const [year, setYear] = useState("2026-2027");
  const [yearError, setYearError] = useState("");
  return <section className="min-w-0 space-y-4" aria-labelledby="database-calendars-title">
    <h2 id="database-calendars-title" className="text-xl font-semibold">Академический календарь</h2>
    <p className="text-sm text-muted">Календарь связан с вузом, учебным годом и программой или курсом. Студенческий экран читает эти же записи из базы.</p>
    {!university ? <EmptyState title="Нет доступных вузов" description="Для редактирования календаря модератору нужны назначенные группы или созданный им вуз." /> : <>
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Вуз календаря" htmlFor="database-calendar-university"><Select id="database-calendar-university" value={university.id} onChange={(event) => setChosen(event.target.value)}>{universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          const value = String(new FormData(event.currentTarget).get("year"));
          if (!/^\d{4}-\d{4}$/.test(value) || Number(value.slice(5)) !== Number(value.slice(0, 4)) + 1) { setYearError("Укажите два соседних года, например 2026-2027."); return; }
          setYearError(""); setYear(value);
        }}>
          <Field label="Учебный год" htmlFor="database-calendar-year" error={yearError}><Input id="database-calendar-year" name="year" defaultValue={year} required pattern="[0-9]{4}-[0-9]{4}" aria-invalid={Boolean(yearError)} aria-describedby={yearError ? "database-calendar-year-error" : undefined} /></Field>
          <Button type="submit" variant="secondary">Показать календарь</Button>
        </form>
      </Card>
      <CalendarRecords key={`${university.id}:${year}`} university={university} year={year} account={account} />
    </>}
  </section>;
}

function CalendarRecords({ university, year, account }: { university: Tables<"universities">; year: string; account: Account }) {
  const [data, setData] = useState<CalendarData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [chosen, setChosen] = useState("");
  useEffect(() => {
    let active = true;
    readCalendars(university.id, year).then((value) => { if (active) setData(value); })
      .catch((error) => { if (active) setError(managementErrorMessage(error)); });
    return () => { active = false; };
  }, [university.id, year, attempt]);
  if (error) return <Card className="space-y-4"><p role="alert">{error}</p><Button onClick={() => { setError(""); setData(null); setAttempt(attempt + 1); }}>Повторить загрузку календаря</Button></Card>;
  if (!data) return <p role="status">Загружаем календарь из базы…</p>;
  const calendar = data.calendars.find((item) => item.id === chosen) ?? data.calendars[0];
  if (!calendar) return <EmptyState title="Календарь не опубликован" description={`${university.name} · ${year}. Создание нового календаря станет доступно после подключения общей операции публикации.`} />;
  return <div className="space-y-4">
    {data.calendars.length > 1 && <Field label="Программа или курс календаря" htmlFor="database-calendar-record"><Select id="database-calendar-record" value={calendar.id} onChange={(event) => setChosen(event.target.value)}>{data.calendars.map((item) => <option key={item.id} value={item.id}>{item.scope}</option>)}</Select></Field>}
    <CalendarDetails key={calendar.id} account={account} calendar={calendar} university={university.name} data={data}
      onCalendar={(saved) => setData((current) => current && { ...current, calendars: current.calendars.map((item) => item.id === saved.id ? saved : item) })}
      onTerm={(saved) => setData((current) => current && { ...current, terms: current.terms.map((item) => item.id === saved.id ? saved : item) })}
      onSource={(saved) => setData((current) => current && { ...current, sources: current.sources.map((item) => item.id === saved.id ? saved : item) })} />
  </div>;
}

function CalendarDetails({ account, calendar, university, data, onCalendar, onTerm, onSource }: {
  account: Account; calendar: Tables<"academic_calendars">; university: string; data: CalendarData;
  onCalendar: (value: Tables<"academic_calendars">) => void; onTerm: (value: Tables<"calendar_terms">) => void; onSource: (value: Tables<"academic_sources">) => void;
}) {
  const [season, setSeason] = useState("autumn");
  const terms = data.terms.filter((item) => item.calendar_id === calendar.id);
  const source = data.sources.find((item) => item.id === calendar.source_id);
  const editable = account.role === "admin" || calendar.status !== "official";
  return <Card className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h3 className="wrap-anywhere text-lg font-semibold">{university} · {calendar.academic_year}</h3><p className="mt-2 wrap-anywhere text-sm">{calendar.scope}</p></div><Badge variant="outline">{calendar.status === "official" ? "Официальный календарь" : calendar.status === "demo" ? "Демонстрационный пример" : "Редакция каталога"}</Badge></div>
    {source ? <div className="space-y-2 text-sm"><a href={source.url} target="_blank" rel="noopener noreferrer" className="wrap-anywhere underline">{source.title} (новая вкладка)</a><p>Область источника: {source.scope}</p><p>Дата сверки: {source.checked_at} · Учебный год: {source.academic_year}</p>{source.note && <p className="wrap-anywhere text-muted">{source.note}</p>}</div> : <p className="text-sm text-muted">Официальный источник для этой записи не указан.</p>}
    {!editable && <p className="text-sm text-muted">Официальный календарь изменяет администратор. Модератор может просматривать его сроки и источник.</p>}
    <div role="group" aria-label="Семестр календаря" className="flex flex-wrap gap-4">{Object.entries(names).map(([value, title]) => <Button key={value} variant={season === value ? "primary" : "secondary"} aria-pressed={season === value} onClick={() => setSeason(value)}>{title}</Button>)}</div>
    {!terms.some((item) => item.season === season) && <p>Сроки этого семестра не указаны.</p>}
    {terms.map((term) => <div key={term.id} hidden={term.season !== season}><TermEditor row={term} year={calendar.academic_year} editable={editable} onSaved={onTerm} /></div>)}
    {editable && <MetadataEditor key={`${calendar.id}:${calendar.status}`} calendar={calendar} sources={data.sources} admin={account.role === "admin"} onSaved={onCalendar} />}
    {account.role === "admin" && source && <SourceEditor key={source.id} source={source} onSaved={onSource} />}
  </Card>;
}

function TermEditor({ row, year, editable, onSaved }: { row: Tables<"calendar_terms">; year: string; editable: boolean; onSaved: (value: Tables<"calendar_terms">) => void }) {
  let parsed: CalendarTerm | null = null;
  let parseError = "";
  try { parsed = calendarTerm(row); } catch (error) { parseError = managementErrorMessage(error); }
  return parsed ? <ValidTermEditor row={row} original={parsed} year={year} editable={editable} onSaved={onSaved} /> : <p role="alert">{parseError}</p>;
}

function ValidTermEditor({ row, original, year, editable, onSaved }: { row: Tables<"calendar_terms">; original: CalendarTerm; year: string; editable: boolean; onSaved: (value: Tables<"calendar_terms">) => void }) {
  const [draft, setDraft] = useState(original);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const changed = rangeKeys.filter((key) => !sameRange(original[key], draft[key]));
  const errorId = `${row.id}-error`;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !changed.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const saved = await saveCalendarTerm(row, year, draft);
      onSaved(saved); setDraft(calendarTerm(saved)); setEditing(false); setMessage("Сроки этого семестра сохранены в базе.");
    } catch (error) { setError(managementErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border border-border p-4">
    <h4 className="font-semibold">{names[original.season]}</h4>
    <dl className="space-y-3 text-sm">{rangeKeys.map((key) => <div key={key}><dt className="text-muted">{rangeNames[key]}</dt><dd className="wrap-anywhere">{formatCalendarRange(original[key])}</dd></div>)}</dl>
    {editable && !editing && <Button variant="secondary" onClick={() => { setDraft(original); setEditing(true); setMessage(""); }}>Изменить сроки семестра</Button>}
    {editing && <form noValidate onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">Сохраняются период и оба РК только этого семестра. Другой семестр и описание календаря сохраняются отдельно.</p>
      <fieldset disabled={busy} className="space-y-4">{rangeKeys.map((key) => <RangeEditor key={key} id={`${row.id}-${key}`} label={rangeNames[key]} value={draft[key]} errorId={error ? errorId : undefined} onChange={(value) => { setDraft({ ...draft, [key]: value }); setError(""); }} />)}</fieldset>
      <section className="space-y-3 rounded-lg bg-surface-muted p-4" aria-label="Изменения перед сохранением"><h5 className="font-semibold">Изменения перед сохранением</h5>{!changed.length ? <p className="text-sm text-muted">Нет изменений.</p> : changed.map((key) => <div key={key} className="space-y-2 text-sm"><p className="font-semibold">{rangeNames[key]}</p><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-muted">Было</dt><dd>{formatCalendarRange(original[key])}</dd></div><div><dt className="text-muted">Станет</dt><dd>{draft[key]?.kind === "dates" && (!draft[key].start || !draft[key].end) ? "Диапазон заполнен не полностью" : formatCalendarRange(draft[key])}</dd></div></dl></div>)}</section>
      {error && <p id={errorId} role="alert" className="text-sm font-semibold">{error}</p>}
      <div className="flex flex-wrap gap-4"><Button type="submit" disabled={busy || !changed.length}>{busy ? "Сохраняем…" : "Сохранить сроки семестра"}</Button><Button variant="secondary" disabled={busy} onClick={() => { setDraft(original); setError(""); setEditing(false); }}>Отмена</Button></div>
    </form>}
    <p role="status" className="text-sm text-muted">{message}</p>
  </section>;
}

function RangeEditor({ id, label, value, errorId, onChange }: { id: string; label: string; value: CalendarRange; errorId?: string; onChange: (value: CalendarRange) => void }) {
  return <fieldset className="min-w-0 space-y-3"><legend className="mb-3 text-sm font-semibold">{label}</legend><Field label="Формат срока" htmlFor={`${id}-kind`}><Select id={`${id}-kind`} value={value?.kind ?? "missing"} onChange={(event) => onChange(event.target.value === "dates" ? { kind: "dates", start: "", end: "" } : event.target.value === "weeks" ? { kind: "weeks", start: 1, end: 1 } : null)}><option value="missing">Срок не указан</option><option value="dates">Даты</option><option value="weeks">Недели</option></Select></Field>{value && <div className="grid min-w-0 gap-4 sm:grid-cols-2">{(["start", "end"] as const).map((key) => <Field key={key} label={`${label}: ${key === "start" ? "начало" : "конец"}`} htmlFor={`${id}-${key}`}><Input id={`${id}-${key}`} className="min-w-0 max-w-full" type={value.kind === "dates" ? "date" : "number"} min={value.kind === "weeks" ? 1 : undefined} max={value.kind === "weeks" ? 53 : undefined} step={1} required value={value[key]} aria-invalid={Boolean(errorId)} aria-describedby={errorId} onChange={(event) => onChange(value.kind === "dates" ? { ...value, [key]: event.target.value } : { ...value, [key]: Number(event.target.value) })} /></Field>)}</div>}</fieldset>;
}

function MetadataEditor({ calendar, sources, admin, onSaved }: { calendar: Tables<"academic_calendars">; sources: CalendarData["sources"]; admin: boolean; onSaved: (value: Tables<"academic_calendars">) => void }) {
  const [fields, setFields] = useState<CalendarMetadata>({ scope: calendar.scope, status: calendar.status, source_id: calendar.source_id });
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  return <details className="space-y-4 border-t border-border pt-4"><summary className="cursor-pointer py-2 font-semibold">Описание и источник календаря</summary><form noValidate className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { const saved = await saveCalendarMetadata(calendar.id, fields); onSaved(saved); setFields({ scope: saved.scope, status: saved.status, source_id: saved.source_id }); setMessage("Описание календаря сохранено в базе."); }
    catch (error) { setError(managementErrorMessage(error)); } finally { setBusy(false); }
  }}><p className="text-sm text-muted">Это отдельное сохранение описания. Оно не изменяет сроки семестров и сам документ источника.</p><fieldset disabled={busy} className="space-y-4"><Field label="Область применения: программа или курс" htmlFor="db-calendar-scope"><Input id="db-calendar-scope" required maxLength={240} value={fields.scope} aria-invalid={Boolean(error)} aria-describedby={error ? "db-calendar-metadata-error" : undefined} onChange={(event) => setFields({ ...fields, scope: event.target.value })} /></Field><Field label="Статус календаря" htmlFor="db-calendar-status"><Select id="db-calendar-status" value={fields.status} onChange={(event) => setFields({ ...fields, status: event.target.value })}><option value="local">Редакция каталога</option><option value="demo">Демонстрационный пример</option>{admin && <option value="official">Официальный календарь</option>}</Select></Field><Field label="Источник этого вуза и учебного года" htmlFor="db-calendar-source"><Select id="db-calendar-source" value={fields.source_id ?? ""} aria-invalid={Boolean(error)} aria-describedby={error ? "db-calendar-metadata-error" : undefined} onChange={(event) => setFields({ ...fields, source_id: event.target.value || null })}><option value="">Источник не указан</option>{sources.filter((source) => source.university_id === calendar.university_id && source.academic_year === calendar.academic_year).map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}</Select></Field></fieldset>{error && <p id="db-calendar-metadata-error" role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить описание календаря"}</Button><p role="status" className="text-sm text-muted">{message}</p></form></details>;
}

function SourceEditor({ source, onSaved }: { source: Tables<"academic_sources">; onSaved: (value: Tables<"academic_sources">) => void }) {
  const [fields, setFields] = useState<SourceFields>({ title: source.title, scope: source.scope, url: source.url, checked_at: source.checked_at, note: source.note });
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const labels = { title: "Название источника", scope: "Область применения источника", url: "Прямая HTTPS-ссылка", checked_at: "Дата сверки", note: "Примечание" };
  return <details className="space-y-4 border-t border-border pt-4"><summary className="cursor-pointer py-2 font-semibold">Редактировать сведения об источнике</summary><form noValidate className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { const saved = await saveCalendarSource(source.id, fields); onSaved(saved); setFields({ title: saved.title, scope: saved.scope, url: saved.url, checked_at: saved.checked_at, note: saved.note }); setMessage("Сведения об источнике сохранены в базе."); }
    catch (error) { setError(managementErrorMessage(error)); } finally { setBusy(false); }
  }}><p className="text-sm text-muted">Источник общий для всех календарей, которые на него ссылаются. Вуз и учебный год сохраняются.</p><fieldset disabled={busy} className="space-y-4">{(Object.keys(labels) as (keyof SourceFields)[]).map((key) => <Field key={key} label={labels[key]} htmlFor={`db-source-${key}`}><Input id={`db-source-${key}`} value={fields[key]} required={key !== "note"} type={key === "url" ? "url" : key === "checked_at" ? "date" : "text"} maxLength={key === "title" || key === "scope" ? 240 : undefined} aria-invalid={Boolean(error)} aria-describedby={error ? "db-source-error" : undefined} onChange={(event) => setFields({ ...fields, [key]: event.target.value })} /></Field>)}</fieldset>{error && <p id="db-source-error" role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить сведения об источнике"}</Button><p role="status" className="text-sm text-muted">{message}</p></form></details>;
}
