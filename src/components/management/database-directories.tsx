"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import type { Tables } from "@/lib/database";
import type { Account } from "@/lib/data/profile";
import { canManageGroup, canManageProgram, canManageUniversity, createGroup, createProgram, createUniversity, managementErrorMessage, saveGroup, saveProgram, saveUniversity, type CatalogData } from "@/lib/data/catalog";
import { CatalogLoading, useDatabaseCatalog } from "./database-catalog";

type DirectoryKind = "universities" | "programs" | "groups";
type SavedEntry = { kind: "universities"; row: Tables<"universities"> } | { kind: "programs"; row: Tables<"programs"> } | { kind: "groups"; row: Tables<"study_groups"> };
const headings = { universities: "Вузы", programs: "Направления", groups: "Группы" };

export function DatabaseDirectories({ account, kind }: { account: Account; kind: DirectoryKind }) {
  const { data, setData, error, reload } = useDatabaseCatalog(account);
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  if (account.role === "student") return <EmptyState title="Справочник недоступен для управления" description="Изменение каталога выполняют сотрудники в назначенной области." />;
  if (!data) return <CatalogLoading error={error} reload={reload} />;
  const universities = data.universities.filter((row) => canManageUniversity(account, data, row.id));
  const entries = kind === "universities" ? universities : kind === "programs"
    ? data.programs.filter((row) => universities.some((university) => university.id === row.university_id))
    : data.groups.filter((row) => canManageGroup(account, data, row.id));
  const shown = entries.filter((row) => row.name.toLowerCase().includes(query.trim().toLowerCase()));
  const canCreate = kind === "universities" || kind === "groups" && account.role === "admin" && data.programs.length > 0 || kind === "programs" && universities.length > 0;

  function accept(saved: SavedEntry) {
    setData((current) => {
      if (!current) return current;
      if (saved.kind === "universities") return { ...current, universities: [...current.universities.filter((row) => row.id !== saved.row.id), saved.row] };
      if (saved.kind === "programs") return { ...current, programs: [...current.programs.filter((row) => row.id !== saved.row.id), saved.row] };
      return { ...current, groups: [...current.groups.filter((row) => row.id !== saved.row.id), saved.row] };
    });
    setEditing(null); setMessage(`Запись «${saved.row.name}» подтверждена базой.`);
  }

  return <div className="min-w-0 space-y-6">
    <PageHeader title={headings[kind]} description={kind === "groups" ? "Группы связаны с направлениями. Создавать и изменять группы может администратор." : "Справочник из базы данных. Доступные действия зависят от назначенной области управления."} action={<Badge>PostgreSQL / Supabase</Badge>} />
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end gap-4"><div className="min-w-0 flex-1"><Field htmlFor="database-directory-search" label="Поиск по названию"><Input id="database-directory-search" value={query} onChange={(event) => setQuery(event.target.value)} /></Field></div>{canCreate && <Button disabled={editing !== null} onClick={() => { setEditing("new"); setMessage(""); }}>Добавить запись</Button>}</div>
      {!shown.length ? <EmptyState title="Записи не найдены" description="Проверьте поиск и доступную область управления." /> : <ul className="divide-y divide-border">
        {shown.map((row) => {
          const allowed = kind === "universities" ? canManageUniversity(account, data, row.id) : kind === "programs" ? canManageProgram(account, data, row.id) : account.role === "admin";
          const program = "program_id" in row ? data.programs.find((item) => item.id === row.program_id) : undefined;
          const universityId = "university_id" in row ? row.university_id : program?.university_id;
          return <li key={row.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="wrap-anywhere font-semibold">{row.name}</p><p className="wrap-anywhere text-sm text-muted">{data.universities.find((item) => item.id === universityId)?.name}{program && ` · ${program.name}`}{"year" in row && ` · ${row.year} курс`}</p></div>{allowed ? <Button variant="secondary" disabled={editing !== null} onClick={() => { setEditing(row.id); setMessage(""); }}>Изменить</Button> : <span className="text-sm text-muted">Только просмотр</span>}</li>;
        })}
      </ul>}
      <p role="status" className="text-sm text-muted">{message}</p>
    </Card>
    {editing && <DirectoryEditor key={`${kind}-${editing}`} kind={kind} id={editing === "new" ? null : editing} data={data} account={account} onSaved={accept} onCancel={() => setEditing(null)} />}
  </div>;
}

function DirectoryEditor({ kind, id, data, account, onSaved, onCancel }: { kind: DirectoryKind; id: string | null; data: CatalogData; account: Account; onSaved: (saved: SavedEntry) => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const entry = data[kind].find((row) => row.id === id);
  const parents = kind === "programs" ? data.universities.filter((row) => canManageUniversity(account, data, row.id)) : data.programs;
  const parent = entry && ("university_id" in entry ? entry.university_id : "program_id" in entry ? entry.program_id : "");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") ?? "");
    const parentId = String(values.get("parent") ?? "");
    const year = Number(values.get("year"));
    setBusy(true); setError("");
    try {
      if (kind === "universities") onSaved({ kind, row: id ? await saveUniversity(id, name) : await createUniversity(name) });
      else if (kind === "programs") onSaved({ kind, row: id ? await saveProgram(id, name) : await createProgram(parentId, name) });
      else onSaved({ kind, row: id ? await saveGroup(id, name, year) : await createGroup(parentId, name, year) });
    } catch (error) { setError(managementErrorMessage(error)); requestAnimationFrame(() => document.getElementById("database-directory-error")?.focus()); }
    finally { setBusy(false); }
  }
  return <Card><form onSubmit={submit} className="space-y-4" aria-describedby={error ? "database-directory-error" : undefined}>
    <h2 className="text-lg font-semibold">{id ? "Редактирование записи" : "Новая запись"}</h2>
    <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Field label="Название" htmlFor="database-directory-name"><Input id="database-directory-name" name="name" required maxLength={kind === "groups" ? 60 : 120} defaultValue={entry?.name ?? ""} aria-describedby={error ? "database-directory-error" : undefined} /></Field>
      {kind !== "universities" && <Field label={kind === "programs" ? "Вуз" : "Направление"} htmlFor="database-directory-parent" hint={id ? "Связь существующей записи не изменяется, чтобы сохранить учебные данные." : undefined}><Select id="database-directory-parent" name="parent" required disabled={Boolean(id)} defaultValue={parent || parents[0]?.id || ""} aria-describedby={id ? "database-directory-parent-hint" : error ? "database-directory-error" : undefined}>{parents.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field>}
      {kind === "groups" && <Field label="Курс" htmlFor="database-directory-year"><Input id="database-directory-year" name="year" type="number" min={1} max={6} step={1} required defaultValue={entry && "year" in entry ? entry.year : 1} aria-describedby={error ? "database-directory-error" : undefined} /></Field>}
    </fieldset>
    {error && <p id="database-directory-error" role="alert" tabIndex={-1}>{error}</p>}
    <div className="flex flex-wrap gap-4"><Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить в базе"}</Button><Button variant="secondary" disabled={busy} onClick={onCancel}>Отмена</Button></div>
  </form></Card>;
}
