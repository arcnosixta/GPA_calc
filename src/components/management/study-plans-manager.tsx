"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select } from "@/components/ui";
import { getManagedGroupIds, saveStudyPlan, useDemoCatalog } from "@/lib/demo-catalog";
import { useDemoSession, type DemoSession } from "@/lib/demo-session";

export function StudyPlansManager() {
  const catalog = useDemoCatalog();
  const session = useDemoSession();
  const [groupId, setGroupId] = useState("");
  const [semester, setSemester] = useState(1);
  if (!session) return <p role="status">{session === undefined ? "Загружаем демосеанс…" : "Войдите в демосеанс."}</p>;
  if (session.role === "student") return <p>Изменение учебных планов недоступно студенту.</p>;
  const groupIds = getManagedGroupIds(session, catalog);
  const groups = catalog.groups.filter((group) => groupIds.includes(group.id));
  const group = groups.find((item) => item.id === groupId) ?? groups[0];

  return <div className="min-w-0 space-y-6">
    <PageHeader eyebrow="Группы и предметы" title="Учебные планы групп"
      description="Выберите группу и семестр, затем составьте план из каталога. Изменения сохраняются в этом браузере." />
    <p className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
      Администратор работает со всеми группами, модератор — с назначенными. Кредиты здесь берутся из каталога для новых учебных записей.
      Уже полученные оценки и зафиксированные кредиты личного плана и архива не меняются.
    </p>
    {!group ? <EmptyState title="Нет назначенных групп" description="Администратор может назначить группы демомодератору на странице пользователей." /> : <>
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Группа учебного плана" htmlFor="plan-group">
          <Select id="plan-group" value={group.id} onChange={(event) => setGroupId(event.target.value)}>
            {groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </Field>
        <Field label="Семестр учебного плана" htmlFor="plan-semester">
          <Select id="plan-semester" value={semester} onChange={(event) => setSemester(Number(event.target.value))}>
            {catalog.semesters.map((item) => <option key={item.number} value={item.number}>{item.number} · {item.title}{item.active ? "" : " · закрыт"}</option>)}
          </Select>
        </Field>
      </Card>
      <PlanEditor key={group.id + "-" + semester} groupId={group.id} semester={semester} session={session} />
    </>}
  </div>;
}

function PlanEditor({ groupId, semester, session }: { groupId: string; semester: number; session: DemoSession }) {
  const catalog = useDemoCatalog();
  const savedPlan = catalog.studyPlans.find((plan) => plan.groupId === groupId && plan.semester === semester);
  const [selectedIds, setSelectedIds] = useState<string[]>(savedPlan?.subjectIds ?? []);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const managedIds = getManagedGroupIds(session, catalog);
  const archivedInPlan = catalog.archivedSubjects.filter((subject) => savedPlan?.subjectIds.includes(subject.id));
  const choices = [...catalog.subjects.filter((subject) => managedIds.includes(subject.groupId) || savedPlan?.subjectIds.includes(subject.id)), ...archivedInPlan];
  const selectedSubjects = choices.filter((subject) => selectedIds.includes(subject.id));
  const semesterOpen = catalog.semesters.find((item) => item.number === semester)?.active;
  const canEdit = semesterOpen || Boolean(savedPlan);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = saveStudyPlan(session, { groupId, semester, subjectIds: selectedIds });
    setError(result.ok ? "" : result.error ?? "Не удалось изменить учебный план.");
    setMessage(result.ok ? "Учебный план изменён." : "");
    if (!result.ok) event.currentTarget.querySelector<HTMLElement>("fieldset")?.focus();
  }

  return <Card className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold">Предметы плана</h2>
        <p className="mt-2 text-sm text-muted">{savedPlan ? "План уже есть в локальном каталоге." : "Для этой группы и семестра план ещё не создан."}</p>
      </div>
      <Badge variant="outline">Выбрано: {selectedIds.length} · Кредиты: {selectedSubjects.reduce((total, subject) => total + subject.credits, 0)}</Badge>
    </div>
    {!canEdit && <p className="text-sm leading-6 text-muted">Семестр закрыт для новых планов. Администратор может открыть его в разделе «Семестры».</p>}
    {!semesterOpen && savedPlan && <p className="text-sm leading-6 text-muted">Семестр закрыт: из существующего плана можно только исключать предметы. Для добавления новых администратор должен открыть семестр.</p>}
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={!canEdit} tabIndex={-1} aria-describedby={error ? "plan-subjects-hint plan-subjects-error" : "plan-subjects-hint"}
        aria-invalid={Boolean(error)} className="min-w-0 space-y-4">
        <legend className="mb-4 text-sm font-semibold">Выбор предметов</legend>
        <p id="plan-subjects-hint" className="text-sm leading-6 text-muted">Можно выбрать предметы доступного каталога. Архивные предметы показаны только в существующем плане: их можно оставить или исключить.</p>
        {choices.length === 0 ? <EmptyState title="Нет доступных предметов" description="Добавьте предмет в каталоге управления, затем вернитесь к учебному плану." /> : choices.map((subject) => {
          const archived = catalog.archivedSubjects.some((item) => item.id === subject.id);
          return <label key={subject.id} className="flex cursor-pointer items-start gap-4 rounded-lg border border-border p-4">
            <input type="checkbox" name="subjects" value={subject.id} checked={selectedIds.includes(subject.id)}
              disabled={!semesterOpen && !savedPlan?.subjectIds.includes(subject.id)}
              className="mt-1 size-4 shrink-0 accent-black" onChange={(event) => {
                setSelectedIds(event.target.checked ? [...selectedIds, subject.id] : selectedIds.filter((id) => id !== subject.id));
                setError(""); setMessage("");
              }} />
            <span className="min-w-0 text-sm leading-6">
              <span className="block wrap-anywhere font-semibold">{subject.title}</span>
              <span className="block wrap-anywhere text-muted">{subject.code || "Без кода"} · Кредиты: {subject.credits} · {catalog.groups.find((group) => group.id === subject.groupId)?.name}</span>
              {archived && <Badge variant="outline">Архивный · уже был в плане</Badge>}
            </span>
          </label>;
        })}
        {error && <p id="plan-subjects-error" role="alert" className="text-sm font-semibold">{error}</p>}
      </fieldset>
      <div className="flex flex-wrap gap-4">
        <Button type="submit" disabled={!canEdit}>Применить план локально</Button>
        <Button variant="secondary" onClick={() => { setSelectedIds(savedPlan?.subjectIds ?? []); setError(""); setMessage("Показан текущий состав локального плана."); }}>Отменить выбор</Button>
      </div>
      <p role="status" className="text-sm leading-6 text-muted">{message}</p>
    </form>
  </Card>;
}
