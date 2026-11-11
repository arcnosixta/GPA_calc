"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Select, buttonStyles } from "@/components/ui";
import { subjectsForGroup, usePersonalPlan } from "./personal-plan";
import { SessionState } from "./session-state";

export function PlanSetup() {
  const { session, catalog, subjects, addSubjects } = usePersonalPlan();
  const { groups, subjects: catalogSubjects } = catalog;
  const semesters = catalog.semesters.filter((semester) => semester.active);
  const semesterNumbers = new Set(semesters.map((semester) => semester.number));
  const getSemester = (id: string) => subjectsForGroup(catalog, id)
    .filter((subject) => semesterNumbers.has(subject.semester))
    .reduce((latest, subject) => Math.max(latest, subject.semester), semesters[0]?.number ?? 1);
  const [mode, setMode] = useState<"group" | "manual">("group");
  const initialGroupId = session?.profile?.groupId ?? groups[0]?.id ?? "";
  const [groupId, setGroupId] = useState(initialGroupId);
  const [selectedSemester, setSemester] = useState(() => getSemester(initialGroupId));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  if (!session?.profile) return <SessionState session={session} />;
  const group = groups.find((item) => item.id === groupId);
  const semester = semesterNumbers.has(selectedSemester) ? selectedSemester : getSemester(groupId);
  const activeSubjects = catalogSubjects.filter((subject) => semesterNumbers.has(subject.semester));
  const availableSubjects = mode === "group"
    ? subjectsForGroup(catalog, groupId, semester).filter((subject) => semesterNumbers.has(subject.semester))
    : activeSubjects.filter((subject) => subject.semester === semester);
  const preview = mode === "group" ? availableSubjects : activeSubjects.filter((subject) => selectedIds.includes(subject.id));
  const credits = preview.reduce((total, subject) => total + subject.credits, 0);
  const additions = preview.filter((subject) => !subjects.some((existing) => existing.id === subject.id));

  function toggleSubject(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return <div className="space-y-6">
    <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6">
      <p className="font-semibold">Демонстрационный предпросмотр</p>
      <p className="mt-1 text-muted">Выберите предметы и добавьте их в локальный план. План, оценки и зафиксированные кредиты сохраняются в этом браузере.</p>
    </div>
    <fieldset>
      <legend className="mb-4 text-sm font-semibold">1. Как подобрать предметы?</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          { value: "group", title: "По моей группе", description: "Готовый набор предметов по программе и семестру." },
          { value: "manual", title: "Самостоятельно", description: "Выбор предметов из демонстрационного каталога." },
        ] as const).map((option) => <label key={option.value} className={`flex cursor-pointer items-start gap-4 rounded-xl border p-6 ${mode === option.value ? "border-primary bg-surface" : "border-border bg-background"}`}>
          <input type="radio" name="plan-mode" value={option.value} checked={mode === option.value} onChange={() => setMode(option.value)} className="mt-1 size-4 shrink-0 accent-zinc-900" />
          <span><span className="block font-semibold">{option.title}</span><span className="mt-2 block text-sm leading-6 text-muted">{option.description}</span></span>
        </label>)}
      </div>
    </fieldset>
    <Card>
      <h2 className="mb-6 text-lg font-semibold">2. {mode === "group" ? "Группа и семестр" : "Каталог предметов"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "group" && <Field label="Учебная группа" htmlFor="plan-group" hint={group ? `${group.program} · ${group.year} курс` : undefined}>
          <Select id="plan-group" value={groupId} onChange={(event) => {
            setGroupId(event.target.value);
            setSemester(getSemester(event.target.value));
          }} aria-describedby={group ? "plan-group-hint" : undefined}>
            {groups.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.program}</option>)}
          </Select>
        </Field>}
        <Field label="Семестр" htmlFor="plan-semester">
          <Select id="plan-semester" value={semester} disabled={!semesters.length} onChange={(event) => setSemester(Number(event.target.value))}>
            {semesters.length ? semesters.map((item) => <option key={item.number} value={item.number}>{item.title}</option>)
              : <option value={semester}>Нет активных семестров</option>}
          </Select>
        </Field>
      </div>
      <div className="mt-6">
        {availableSubjects.length === 0 ? <EmptyState title="В этом семестре нет предметов" description="Попробуйте выбрать другой семестр или группу." /> : <fieldset>
          <legend className="mb-4 text-sm font-medium">{mode === "group" ? "Предметы группы в выбранном семестре" : "Отметьте нужные предметы"}</legend>
          <ul className="divide-y divide-border">
            {availableSubjects.map((subject) => <li key={subject.id} className="py-4 first:pt-0 last:pb-0">
              <label className={`flex items-start gap-4 ${mode === "manual" ? "cursor-pointer" : ""}`}>
                {mode === "manual" && <input type="checkbox" checked={selectedIds.includes(subject.id)} onChange={() => toggleSubject(subject.id)} className="mt-1 size-4 shrink-0 accent-zinc-900" />}
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold">{subject.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">{subject.code} · {groups.find((item) => item.id === subject.groupId)?.name} · Кредиты: {subject.credits}</span>
                </span>
              </label>
            </li>)}
          </ul>
        </fieldset>}
      </div>
    </Card>
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">3. Предпросмотр плана</h2>
        <Badge variant="outline">Без сохранения</Badge>
      </div>
      <p role="status" className="mt-4 text-sm text-muted">Предметов: {preview.length} · Кредитов: {credits}{mode === "manual" ? " · за все выбранные семестры" : ` · ${semester} семестр`}</p>
      {preview.length > 0 ? <ul className="mt-4 space-y-4">
        {preview.map((subject) => <li key={subject.id} className="flex flex-col gap-1 border-l-2 border-border pl-4 text-sm">
          <span className="font-medium">{subject.title}</span>
          <span className="text-xs text-muted">{subject.code} · {subject.semester} семестр · Кредиты: {subject.credits}</span>
        </li>)}
      </ul> : <p className="mt-4 text-sm leading-6 text-muted">{mode === "manual" ? "Выберите предметы в каталоге, чтобы увидеть свой набор." : "Для выбранной группы и семестра пока нет предметов в демокаталоге."}</p>}
      <div className="mt-6 flex flex-wrap gap-4">
        <Button disabled={additions.length === 0} onClick={() => {
          const added = addSubjects(preview);
          setMessage(`Добавлено в локальный план: ${added}. Откройте «Мои предметы», чтобы поставить оценки.`);
        }}>Добавить в локальный план</Button>
        <Link href="/subjects" className={buttonStyles()}>Открыть мои предметы</Link>
        {mode === "manual" && <Button variant="secondary" disabled={selectedIds.length === 0} onClick={() => setSelectedIds([])}>Сбросить выбор</Button>}
      </div>
      <p role="status" className="mt-4 text-xs leading-5 text-muted">{message || "Повторы не добавляются. Новые предметы добавляются без оценки; профиль и группа не меняются."}</p>
    </Card>
  </div>;
}
