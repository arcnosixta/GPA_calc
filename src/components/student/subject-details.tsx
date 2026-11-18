"use client";

import Link from "next/link";
import { PageHeader, buttonStyles } from "@/components/ui";
import { siteRoutes } from "@/lib/site-routes";
import { usePersonalPlan } from "./personal-plan";
import { SessionState } from "./session-state";
import { SubjectAssessmentForm } from "./subject-assessment-form";

export function SubjectDetails({ subjectId }: { subjectId: string }) {
  const { session, subjects, calendarId, assessments, setAssessment } = usePersonalPlan();
  if (!session?.profile) return <SessionState session={session} />;

  const subject = subjects.find((item) => item.id === subjectId);
  const backLink = <Link href={siteRoutes.subjects.path} className={buttonStyles("secondary")}>Мои предметы</Link>;
  if (!subject) {
    return <PageHeader title="Предмет не найден" description="В вашем учебном плане нет предмета по этой ссылке." action={backLink} />;
  }

  const otherGradedCredits = subjects.reduce((sum, item) => sum + (item.id !== subject.id && item.grade !== null ? item.credits : 0), 0);

  return (
    <div className="min-w-0 space-y-6 break-words">
      <PageHeader eyebrow="Мои предметы" title={subject.title} description={`${subject.code} · ${subject.semester} семестр`} action={backLink} />
      <SubjectAssessmentForm key={`${session.email}:${subject.id}`} subject={subject} otherGradedCredits={otherGradedCredits} calendarId={calendarId}
        assessment={assessments[subject.id]} onSave={(scores) => setAssessment(subject.id, scores)} />
    </div>
  );
}
