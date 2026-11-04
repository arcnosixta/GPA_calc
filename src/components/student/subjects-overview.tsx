"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, EmptyState, Field, PageHeader, Select, buttonStyles } from "@/components/ui";
import { gradeOptions } from "@/lib/demo-data";
import type { Grade } from "@/lib/types";
import { usePersonalPlan } from "./personal-plan";
import { SessionState } from "./session-state";
import { StudentSummary } from "./student-summary";

export function SubjectsOverview() {
  const { session, catalog, subjects, setGrade } = usePersonalPlan();
  const [selectedSemester, setSemester] = useState<number | null>(null);
  if (!session?.profile) return <SessionState session={session} />;
  const semesters = [...new Set(subjects.map((subject) => subject.semester))].sort((a, b) => a - b);
  const semester = selectedSemester ?? semesters.at(-1) ?? 1;
  const visible = subjects.filter((subject) => subject.semester === semester);
  const group = catalog.groups.find((item) => item.id === session.profile?.groupId);
  return <div className="min-w-0 space-y-6">
    <PageHeader eyebrow="Моё обучение" title="Мои предметы" description={group?.name ?? "Личный учебный план"}
      action={<Link href="/setup" className={buttonStyles("secondary")}>Выбор учебного плана</Link>} />
    <p className="text-sm leading-6 text-muted">Демонстрационные оценки общие с главной страницей. Они действуют до обновления вкладки или нового входа. Кредиты личного плана зафиксированы и доступны только для чтения.</p>
    <Field label="Семестр" htmlFor="subjects-semester">
      <Select id="subjects-semester" value={semester} onChange={(event) => setSemester(Number(event.target.value))}>
        {(semesters.length ? semesters : [1]).map((value) => <option key={value} value={value}>{value} семестр</option>)}
      </Select>
    </Field>
    <StudentSummary subjects={subjects} semester={semester} />
    {visible.length ? <Card>
      <h2 className="text-lg font-semibold">Предметы и оценки</h2>
      <ul className="mt-6 divide-y divide-border">
        {visible.map((subject) => <li key={subject.id} className="grid min-w-0 gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_12rem] sm:items-end">
          <div className="min-w-0"><p className="text-xs text-muted">{subject.code} · {subject.semester} семестр</p><h3 className="mt-1 break-words font-semibold">{subject.title}</h3><p className="mt-2 text-sm text-muted">Кредиты: {subject.credits}</p></div>
          <Field label={`Оценка: ${subject.code}`} htmlFor={`grade-${subject.id}`}>
            <Select id={`grade-${subject.id}`} value={subject.grade ?? ""} onChange={(event) => setGrade(subject.id, event.target.value ? event.target.value as Grade : null)}>
              <option value="">Без оценки</option>
              {gradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
            </Select>
          </Field>
        </li>)}
      </ul>
    </Card> : <EmptyState title="В плане пока нет предметов" description="Выберите предметы из каталога на странице настройки." />}
  </div>;
}