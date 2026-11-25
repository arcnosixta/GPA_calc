"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import type { Tables } from "@/lib/database";
import type { Account } from "@/lib/data/profile";
import { archiveSubject, canManageGroup, canManageSubject, canUseProgram, createSubject, managementErrorMessage, readCatalog, saveSubject, type CatalogData } from "@/lib/data/catalog";

export function useDatabaseCatalog(account: Account) {
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState("");
  const request = useRef(0);
  const reload = useCallback(async () => {
    const current = ++request.current;
    setData(null); setError("");
    try {
      const catalog = await readCatalog();
      if (current === request.current) setData(catalog);
    } catch (error) { if (current === request.current) setError(managementErrorMessage(error)); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    const sequence = request;
    return () => { clearTimeout(timer); sequence.current++; };
  }, [account.user.id, account.role, reload]);
  return { data, setData, error, reload };
}

export function CatalogLoading({ error, reload }: { error: string; reload: () => Promise<void> }) {
  return error ? <Card className="space-y-4"><p role="alert">{error}</p><Button onClick={() => void reload()}>Повторить загрузку</Button></Card>
    : <p role="status">Загружаем каталог из базы…</p>;
}

export function DatabaseCatalog({ account }: { account: Account }) {
  const { data, setData, error, reload } = useDatabaseCatalog(account);
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("");
  const [semester, setSemester] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Tables<"subjects"> | "new" | null>(null);
  const [archiveId, setArchiveId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  if (account.role === "student") return <EmptyState title="Управление каталогом недоступно" description="Студент выбирает предметы в личном учебном плане." />;
  if (!data) return <CatalogLoading error={error} reload={reload} />;
  const programs = data.programs.filter((item) => canUseProgram(account, data, item.id));
  const groups = data.groups.filter((item) => canManageGroup(account, data, item.id));
  const subjects = data.subjects.filter((subject) => programs.some((program) => program.id === subject.program_id) &&
    (showArchived || !subject.archived_at) && `${subject.title} ${subject.code}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    ((!groupId && !semester) || data.plans.some((plan) => plan.subject_id === subject.id && (!groupId || plan.group_id === groupId) && (!semester || plan.semester === Number(semester)))));

  function acceptSubject(subject: Tables<"subjects">) {
    setData((current) => current && { ...current, subjects: current.subjects.some((item) => item.id === subject.id)
      ? current.subjects.map((item) => item.id === subject.id ? subject : item) : [...current.subjects, subject] });
  }

  async function confirmArchive(id: string) {
    setBusy(true); setActionError(""); setMessage("");
    try {
      const saved = await archiveSubject(id);
      acceptSubject(saved); setArchiveId("");
      if (editing !== "new" && editing?.id === id) setEditing(null);
      setMessage(`Предмет «${saved.title}» архивирован в базе. Личные записи и оценки сохранены.`);
    } catch (error) { setActionError(managementErrorMessage(error)); }
    finally { setBusy(false); }
  }

  return <div className="min-w-0 space-y-6">
    <PageHeader title="Управление" description="Каталог предметов из базы. Изменение названия и кредитов не меняет уже сохранённые личные записи." action={<Badge>PostgreSQL / Supabase</Badge>} />
    <Card className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Поиск по названию или коду" htmlFor="database-subject-search"><Input id="database-subject-search" value={query} onChange={(event) => setQuery(event.target.value)} /></Field>
        <Field label="Группа в учебном плане" htmlFor="database-subject-group"><Select id="database-subject-group" value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Все доступные группы</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</Select></Field>
        <Field label="Семестр в учебном плане" htmlFor="database-subject-semester"><Select id="database-subject-semester" value={semester} onChange={(event) => setSemester(event.target.value)}><option value="">Все семестры</option>{data.semesters.map((item) => <option key={item.number} value={item.number}>{item.number} · {item.title}</option>)}</Select></Field>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="size-4 accent-black" />Показать архивные предметы</label>
      <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted">Найдено предметов: {subjects.length}</p><Button disabled={!programs.length || busy || editing !== null} onClick={() => { setEditing("new"); setMessage(""); }}>Добавить предмет</Button></div>
      {!subjects.length ? <EmptyState title="Предметы не найдены" description="Измените фильтры или добавьте предмет в доступное направление." /> : <div tabIndex={0} role="region" aria-label="Каталог предметов" className="max-w-full overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[680px] text-left text-sm"><caption className="sr-only">Каталог и связи с учебными планами</caption><thead className="bg-surface-muted"><tr>{["Код и предмет", "Кредиты", "Направление", "Планы", "Действия"].map((label) => <th key={label} scope="col" className="p-4">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">
          {subjects.map((subject) => {
            const plans = data.plans.filter((plan) => plan.subject_id === subject.id && groups.some((group) => group.id === plan.group_id));
            const allowed = canManageSubject(account, data, subject.id);
            return <tr key={subject.id}><td className="max-w-64 break-words p-4"><p>{subject.code || "Без кода"}</p><p className="font-semibold">{subject.title}</p>{subject.archived_at && <Badge variant="outline">Архивный</Badge>}</td><td className="p-4">{subject.credits}</td><td className="max-w-52 break-words p-4">{data.programs.find((program) => program.id === subject.program_id)?.name}</td><td className="p-4">{plans.length ? plans.map((plan) => <p key={`${plan.group_id}-${plan.semester}`}>{data.groups.find((group) => group.id === plan.group_id)?.name} · семестр {plan.semester}</p>) : "Не включён"}</td><td className="p-4">
              {allowed ? <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy || editing !== null} onClick={() => { setEditing(subject); setMessage(""); }}>Изменить</Button>{!subject.archived_at && <Button variant="ghost" disabled={busy || editing !== null} onClick={() => { setArchiveId(subject.id); setActionError(""); }}>Архивировать</Button>}</div> : <p className="text-muted">Только просмотр</p>}
              {archiveId === subject.id && <div className="mt-3 space-y-3"><p>Архивировать «{subject.title}»? Новые планы не смогут его выбрать.</p><Button disabled={busy} onClick={() => void confirmArchive(subject.id)}>Подтвердить архивирование</Button><Button variant="ghost" disabled={busy} onClick={() => setArchiveId("")}>Отмена</Button></div>}
            </td></tr>;
          })}
        </tbody></table>
      </div>}
      {actionError && <p role="alert">{actionError}</p>}
      <p role="status" className="text-sm text-muted">{message}</p>
    </Card>
    {editing && <SubjectEditor key={editing === "new" ? "new" : editing.id} subject={editing === "new" ? null : editing} programs={programs} onCancel={() => setEditing(null)} onSaved={(subject) => { acceptSubject(subject); setEditing(null); setMessage(`Предмет «${subject.title}» подтверждён базой.`); }} />}
  </div>;
}

function SubjectEditor({ subject, programs, onSaved, onCancel }: { subject: Tables<"subjects"> | null; programs: Tables<"programs">[]; onSaved: (subject: Tables<"subjects">) => void; onCancel: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true); setError("");
    const fields = { title: String(values.get("title") ?? ""), code: String(values.get("code") ?? ""), credits: Number(values.get("credits")) };
    try { onSaved(subject ? await saveSubject(subject.id, fields) : await createSubject(String(values.get("program")), fields)); }
    catch (error) { setError(managementErrorMessage(error)); requestAnimationFrame(() => document.getElementById("database-subject-error")?.focus()); }
    finally { setBusy(false); }
  }
  return <Card><form onSubmit={submit} className="space-y-4" aria-describedby={error ? "database-subject-error" : undefined}>
    <h2 className="text-lg font-semibold">{subject ? "Редактирование предмета" : "Новый предмет"}</h2>
    <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Field label="Название" htmlFor="database-subject-title"><Input id="database-subject-title" name="title" required maxLength={120} defaultValue={subject?.title ?? ""} aria-describedby={error ? "database-subject-error" : undefined} /></Field>
      <Field label="Код" htmlFor="database-subject-code" hint="Код нового предмета нужен для защиты от повторного добавления."><Input id="database-subject-code" name="code" required={!subject} maxLength={20} defaultValue={subject?.code ?? ""} aria-describedby={`database-subject-code-hint${error ? " database-subject-error" : ""}`} /></Field>
      <Field label="Кредиты" htmlFor="database-subject-credits"><Input id="database-subject-credits" name="credits" type="number" required min={1} max={30} step={1} defaultValue={subject?.credits ?? 3} aria-describedby={error ? "database-subject-error" : undefined} /></Field>
      <Field label="Направление" htmlFor="database-subject-program" hint={subject ? "Направление существующего предмета не переносится." : undefined}><Select id="database-subject-program" name="program" required disabled={Boolean(subject)} defaultValue={subject?.program_id ?? programs[0]?.id ?? ""} aria-describedby={subject ? "database-subject-program-hint" : undefined}>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</Select></Field>
    </fieldset>
    {error && <p id="database-subject-error" role="alert" tabIndex={-1}>{error}</p>}
    <div className="flex flex-wrap gap-4"><Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить в базе"}</Button><Button variant="secondary" disabled={busy} onClick={onCancel}>Отмена</Button></div>
  </form></Card>;
}
