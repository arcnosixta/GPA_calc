"use client";

import Link from "next/link";
import { Badge, Card, PageHeader, buttonStyles } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { demoGroups, demoStudent, demoSummary, getDemoGroupPlan, gradeOptions } from "@/lib/demo-data";
import { useDemoSession } from "@/lib/demo-session";
import { siteRoutes } from "@/lib/site-routes";

export function DashboardOverview() {
  const profile = useDemoSession()?.profile;
  if (!profile) return null;

  const group = demoGroups.find((item) => item.id === profile.groupId);
  const { semester, subjects } = getDemoGroupPlan(profile.groupId);
  const graded = subjects.filter((subject) => subject.grade !== null);
  const lowestGrades = graded.map((subject) => ({ subject, rank: gradeOptions.findIndex((grade) => grade === subject.grade) }));
  const weakest = lowestGrades.filter(({ rank }) => rank > gradeOptions.indexOf("B+"))
    .sort((first, second) => second.rank - first.rank).slice(0, 2);
  const currentGpa = group?.id === demoStudent.groupId ? demoSummary.semesterGpa : null;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader eyebrow="Моё обучение" title="Главная" description={group ? `${group.name} · ${semester} семестр` : "Сводка успеваемости"}
        action={<Link href={siteRoutes.profile.path} className={buttonStyles("secondary")}>Личный кабинет</Link>} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold">Текущий GPA</h2>
          <p className="mt-4 text-4xl font-semibold tabular-nums">{currentGpa ?? "—"}{currentGpa && <span className="ml-2 text-sm font-normal text-muted">/ 4.00</span>}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{graded.length ? `${graded.length} из ${subjects.length} предметов с оценкой · демоданные` : "Появится после добавления оценок."}</p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold">Прогноз GPA</h2>
          <p className="mt-4 text-4xl font-semibold tabular-nums">—</p>
          <p className="mt-2 text-sm leading-6 text-muted">Здесь появится результат по предполагаемым оценкам.</p>
        </Card>
      </div>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Предметы, которым нужно внимание</h2>
            <p className="mt-2 text-sm leading-6 text-muted">До двух предметов с оценками ниже B+.</p>
          </div>
          <Link href={siteRoutes.subjects.path} className={buttonStyles("secondary")}>Мои предметы <Icon name="arrow" className="size-4" /></Link>
        </div>
        {weakest.length ? <ul className="mt-4 divide-y divide-border">
          {weakest.map(({ subject }) => <li key={subject.id} className="flex items-center justify-between gap-3 py-3 last:pb-0">
            <span className="min-w-0 break-words text-sm font-medium">{subject.title}</span><Badge variant="outline">{subject.grade}</Badge>
          </li>)}
        </ul> : <p className="mt-4 text-sm text-muted">{graded.length ? "Оценок ниже B+ нет." : "За этот семестр ещё нет оценок."}</p>}
      </Card>
    </div>
  );
}
