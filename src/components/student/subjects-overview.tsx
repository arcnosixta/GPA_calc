"use client";

import Link from "next/link";
import { Card, EmptyState, PageHeader, buttonStyles } from "@/components/ui";
import { StudyPlanList } from "@/components/student/study-plan-list";
import { StudentSummary } from "@/components/student/student-summary";
import { demoGroups, demoStudent, getDemoGroupPlan } from "@/lib/demo-data";
import { useDemoSession } from "@/lib/demo-session";
import { siteRoutes } from "@/lib/site-routes";

export function SubjectsOverview() {
  const profile = useDemoSession()?.profile;
  if (!profile) return null;

  const group = demoGroups.find((item) => item.id === profile.groupId);
  const { semester, subjects } = getDemoGroupPlan(profile.groupId);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Моё обучение" title="Мои предметы" description={group ? `${group.name} · ${semester} семестр` : "Текущий учебный план"}
        action={<Link href={siteRoutes.setup.path} className={buttonStyles("secondary")}>Выбор учебного плана</Link>} />
      {group?.id === demoStudent.groupId && <StudentSummary />}
      {subjects.length ? <Card>
        <h2 className="text-lg font-semibold">Предметы и оценки</h2>
        <p className="mb-6 mt-2 text-sm leading-6 text-muted">Демонстрационные оценки текущего семестра. Ввод своих оценок появится в следующем обновлении интерфейса.</p>
        <StudyPlanList subjects={subjects} />
      </Card> : <EmptyState title="В плане пока нет предметов" description="Предметы появятся, когда для группы будет заполнен учебный план." />}
    </div>
  );
}
