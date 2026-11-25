"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select } from "@/components/ui";
import { canManageGroup, managementErrorMessage, readCatalog, type CatalogData } from "@/lib/data/catalog";
import type { Account } from "@/lib/data/profile";

export function DatabaseStudyPlans({ account }: { account: Account }) {
  const [catalog, setCatalog] = useState<CatalogData>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [groupId, setGroupId] = useState("");
  const [semester, setSemester] = useState(0);
  useEffect(() => {
    let active = true;
    readCatalog().then((data) => { if (active) setCatalog(data); })
      .catch((error) => { if (active) setError(managementErrorMessage(error)); });
    return () => { active = false; };
  }, [attempt]);
  if (error) return <Card className="space-y-4"><p role="alert">{error}</p><Button onClick={() => { setError(""); setCatalog(undefined); setAttempt(attempt + 1); }}>Повторить</Button></Card>;
  if (!catalog) return <p role="status">Загружаем учебные планы…</p>;
  const groups = catalog.groups.filter((group) => canManageGroup(account, catalog, group.id));
  const group = groups.find((group) => group.id === groupId) ?? groups[0];
  const selectedSemester = catalog.semesters.find((item) => item.number === semester) ?? catalog.semesters[0];

  return <div className="min-w-0 space-y-6">
    <PageHeader title="Учебные планы групп" description="Состав плана читается из базы. Личные оценки и зафиксированные кредиты студентов хранятся отдельно." />
    {!group ? <EmptyState title="Нет назначенных групп" description="Администратор может назначить модератору группы в разделе пользователей." /> : !selectedSemester ? <EmptyState title="Семестры ещё не созданы" description="Администратор может добавить семестры в справочнике." /> : <>
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Группа учебного плана" htmlFor="database-plan-group"><Select id="database-plan-group" value={group.id} onChange={(event) => setGroupId(event.target.value)}>
          {groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select></Field>
        <Field label="Семестр учебного плана" htmlFor="database-plan-semester"><Select id="database-plan-semester" value={selectedSemester.number} onChange={(event) => setSemester(Number(event.target.value))}>
          {catalog.semesters.map((item) => <option key={item.number} value={item.number}>{item.number} · {item.title}{item.is_active ? "" : " · закрыт"}</option>)}
        </Select></Field>
      </Card>
      <PlanPreview key={`${group.id}:${selectedSemester.number}`} catalog={catalog} groupId={group.id} semester={selectedSemester.number} />
    </>}
  </div>;
}

function PlanPreview({ catalog, groupId, semester }: { catalog: CatalogData; groupId: string; semester: number }) {
  const savedIds = catalog.plans.filter((item) => item.group_id === groupId && item.semester === semester).map((item) => item.subject_id);
  const [selectedIds, setSelectedIds] = useState(savedIds);
  const group = catalog.groups.find((item) => item.id === groupId)!;
  const open = catalog.semesters.find((item) => item.number === semester)?.is_active;
  const choices = catalog.subjects.filter((subject) => subject.program_id === group.program_id && (!subject.archived_at || savedIds.includes(subject.id)));
  const selected = choices.filter((subject) => selectedIds.includes(subject.id));
  const changed = selectedIds.length !== savedIds.length || selectedIds.some((id) => !savedIds.includes(id));

  return <Card className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><h2 className="text-lg font-semibold">Предметы плана</h2><Badge variant="outline">Выбрано: {selected.length} · Кредиты каталога: {selected.reduce((sum, item) => sum + item.credits, 0)}</Badge></div>
    <p className="text-sm text-muted">Предпросмотр. Публикация станет доступна после подключения операции, которая сохраняет весь состав плана за один запрос. Сейчас выбор не записывается в базу.</p>
    {!open && <p className="text-sm text-muted">Семестр закрыт: новые предметы выбирать нельзя. Прежние записи остаются в плане.</p>}
    <fieldset className="min-w-0 space-y-4">
      <legend className="mb-4 font-semibold">Состав выбранного семестра</legend>
      {!choices.length ? <EmptyState title="Предметов пока нет" description="Добавьте предметы этого направления в каталог." /> : choices.map((subject) => <label key={subject.id} className="flex items-start gap-4 rounded-lg border border-border p-4">
        <input type="checkbox" checked={selectedIds.includes(subject.id)} disabled={(!open || Boolean(subject.archived_at)) && !savedIds.includes(subject.id)}
          className="mt-1 size-4 shrink-0 accent-black" onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, subject.id] : selectedIds.filter((id) => id !== subject.id))} />
        <span className="min-w-0 text-sm"><span className="block wrap-anywhere font-semibold">{subject.title}</span><span className="mt-1 block text-muted">{subject.code || "Без кода"} · {subject.credits} кр.{subject.archived_at ? " · архивный, уже есть в плане" : ""}</span></span>
      </label>)}
    </fieldset>
    <div className="flex flex-wrap gap-4"><Button disabled>Публикация пока недоступна</Button><Button variant="secondary" disabled={!changed} onClick={() => setSelectedIds(savedIds)}>Вернуть сохранённый состав</Button></div>
    <p role="status" className="text-sm text-muted">{changed ? "В предпросмотре есть изменения. Они не сохранены." : "Показан сохранённый состав из базы."}</p>
  </Card>;
}
