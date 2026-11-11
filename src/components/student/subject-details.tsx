"use client";

import Link from "next/link";
import { Card, PageHeader, buttonStyles } from "@/components/ui";
import { siteRoutes } from "@/lib/site-routes";
import { gradePoints } from "./integration-adapter";
import { usePersonalPlan } from "./personal-plan";
import { SessionState } from "./session-state";
import { SubjectAssessmentForm } from "./subject-assessment-form";
import { SubjectGradeField } from "./subject-grade-field";

export function SubjectDetails({ subjectId }: { subjectId: string }) {
  const { session, subjects, setGrade, calendarId, assessments, setAssessment } = usePersonalPlan();
  if (!session?.profile) return <SessionState session={session} />;

  const subject = subjects.find((item) => item.id === subjectId);
  const backLink = <Link href={siteRoutes.subjects.path} className={buttonStyles("secondary")}>Мои предметы</Link>;
  if (!subject) {
    return <PageHeader title="Предмет не найден" description="В вашем учебном плане нет предмета по этой ссылке." action={backLink} />;
  }

  const points = subject.grade === null ? null : gradePoints[subject.grade];
  const weightedPoints = points === null ? null : points * subject.credits;
  const gradedCredits = subjects.reduce((sum, item) => sum + (item.grade === null ? 0 : item.credits), 0);
  const contribution = weightedPoints !== null && gradedCredits > 0 ? weightedPoints / gradedCredits : null;
  const metrics = [
    { title: "Кредиты", value: subject.credits, hint: "Вес предмета в учебном плане" },
    { title: "GPA по предмету", value: points?.toFixed(2) ?? "—", hint: "Балл оценки по шкале от 0 до 4" },
    { title: "Взвешенные баллы", value: weightedPoints?.toFixed(2) ?? "—", hint: "Балл оценки × кредиты предмета" },
    { title: "Вклад в общий GPA", value: contribution?.toFixed(2) ?? "—", hint: "Взвешенные баллы ÷ кредиты всех оценённых предметов" },
  ];

  return (
    <div className="min-w-0 space-y-6 break-words">
      <PageHeader eyebrow="Мои предметы" title={subject.title} description={`${subject.code} · ${subject.semester} семестр`} action={backLink} />
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Итоговая оценка</h2>
        <div className="max-w-xs"><SubjectGradeField subject={subject} setGrade={setGrade} fieldId={`detail-grade-${subject.id}`} /></div>
        {points === null && <p className="mt-3 text-sm text-muted">Выберите оценку, чтобы учесть этот предмет в GPA.</p>}
      </Card>
      <dl aria-label="Расчёт GPA по предмету" aria-live="polite" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <Card key={metric.title}>
          <dt className="text-sm text-muted">{metric.title}</dt>
          <dd className="mt-3 text-3xl font-semibold tabular-nums">{metric.value}</dd>
          <dd className="mt-2 text-xs leading-5 text-muted">{metric.hint}</dd>
        </Card>)}
      </dl>
      <SubjectAssessmentForm key={`${session.email}:${subject.id}`} subjectId={subject.id} calendarId={calendarId}
        assessment={assessments[subject.id]} onSave={(scores) => setAssessment(subject.id, scores)} />
    </div>
  );
}
