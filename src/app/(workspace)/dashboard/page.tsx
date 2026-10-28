import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, PageHeader, buttonStyles } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { StudyPlanList } from "@/components/student/study-plan-list";
import { StudentSummary } from "@/components/student/student-summary";
import { demoGroups, demoStudent, demoStudyPlan } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Личный кабинет" };

export default function Page() {
  const group = demoGroups.find((item) => item.id === demoStudent.groupId);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Моё обучение" title="Личный кабинет" description="Учебный план, оценки и академический прогресс — всё перед глазами."
        action={<Link href="/setup" className={buttonStyles("secondary")}><Icon name="settings" />Настроить план</Link>} />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-muted font-semibold">{demoStudent.initials}</span>
            <div className="min-w-0">
              <h2 className="break-words text-lg font-semibold">{demoStudent.name}</h2>
              <p className="mt-1 text-sm text-muted">{group?.name} · {demoStudent.semester} семестр</p>
              <p className="mt-1 text-sm text-muted">{group?.program}</p>
            </div>
          </div>
          <Badge variant="outline">Демонстрационные данные</Badge>
        </div>
      </Card>
      <StudentSummary />
      <Card>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Мой учебный план</h2><p className="mt-1 text-sm text-muted">Предметы текущего демоплана · {demoStudent.semester} семестр</p></div>
          <Link href="/subjects" className={buttonStyles("secondary")}>Все предметы<Icon name="arrow" /></Link>
        </div>
        <StudyPlanList subjects={demoStudyPlan} />
      </Card>
      <p className="text-xs leading-5 text-muted">Это пример личного кабинета. Данные и показатели подготовлены для демонстрации и не сохраняются.</p>
    </div>
  );
}
