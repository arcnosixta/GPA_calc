import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, buttonStyles } from "@/components/ui";
import { StudyPlanList } from "@/components/student/study-plan-list";
import { StudentSummary } from "@/components/student/student-summary";
import { demoGroups, demoStudent, demoStudyPlan } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Мои предметы" };

export default function Page() {
  const group = demoGroups.find((item) => item.id === demoStudent.groupId);
  return <div className="space-y-6">
    <PageHeader eyebrow="Моё обучение" title="Мои предметы" description={`${group?.name} · ${demoStudent.semester} семестр. Личный учебный план на демонстрационных данных.`}
      action={<Link href="/setup" className={buttonStyles("secondary")}>Выбор учебного плана</Link>} />
    <StudentSummary />
    <Card>
      <h2 className="text-lg font-semibold">Предметы и оценки</h2>
      <p className="mb-6 mt-2 text-sm leading-6 text-muted">Показаны исходные оценки демопримера. Предметы без оценки ещё ожидают результата.</p>
      <StudyPlanList subjects={demoStudyPlan} />
    </Card>
    <p className="text-xs leading-5 text-muted">Сводка демонстрационная. Редактирование оценок, расчёт GPA и сохранение появятся на следующем этапе.</p>
  </div>;
}
