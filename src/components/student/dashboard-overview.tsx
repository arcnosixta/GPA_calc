"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Card, Field, PageHeader, Select, buttonStyles } from "@/components/ui";
import { subjectDetailsPath } from "@/lib/site-routes";
import { AcademicCalendar } from "./academic-calendar";
import { gradePoints } from "./integration-adapter";
import { GradeForecast } from "./grade-forecast";
import { usePersonalPlan } from "./personal-plan";
import { SessionState } from "./session-state";
import { StudentSummary } from "./student-summary";
import { StudyPlanList } from "./study-plan-list";

export function DashboardOverview() {
  const { session, catalog, subjects, calendarId, setAcademicCalendar } = usePersonalPlan();
  const [selectedSemester, setSemester] = useState<number | null>(null);
  if (!session?.profile) return <SessionState session={session} />;
  const profile = session.profile;
  const group = catalog.groups.find((item) => item.id === profile.groupId);
  const university = catalog.universities.find((item) => item.id === profile.universityId);
  const semesters = [...new Set(subjects.map((subject) => subject.semester))].sort((a, b) => a - b);
  const semester = selectedSemester ?? semesters.at(-1) ?? 1;
  const current = subjects.filter((subject) => subject.semester === semester);
  const weakest = current.filter((subject) => subject.grade !== null && gradePoints[subject.grade] < gradePoints["B+"])
    .sort((a, b) => gradePoints[a.grade!] - gradePoints[b.grade!]).slice(0, 2);
  const ungraded = current.filter((subject) => subject.grade === null);
  return <div className="min-w-0 space-y-6">
    <PageHeader eyebrow="Моё обучение" title="Главная" description={`${profile.firstName} ${profile.lastName} · ${university?.name ?? "Вуз не найден"} · ${group?.name ?? "Группа не найдена"}`}
      action={<Link href="/profile" className={buttonStyles("secondary")}>Личный кабинет</Link>} />
    <p className="text-sm leading-6 text-muted">Оценки из «Моих предметов» и прогноз GPA сохраняются в этом браузере.</p>
    <Field label="Семестр" htmlFor="dashboard-semester">
      <Select id="dashboard-semester" value={semester} onChange={(event) => setSemester(Number(event.target.value))}>
        {(semesters.length ? semesters : [1]).map((value) => <option key={value} value={value}>{value} семестр</option>)}
      </Select>
    </Field>
    <StudentSummary subjects={subjects} semester={semester} />
    <AcademicCalendar semester={semester} calendarId={calendarId} onCalendarChange={setAcademicCalendar} />
    <Card>
      <h2 className="text-lg font-semibold">Предметы, которым нужно внимание</h2>
      <p className="mt-2 text-sm text-muted">До двух оценок ниже B+, начиная с самой низкой.</p>
      {weakest.length ? <ul className="mt-4 divide-y divide-border">{weakest.map((subject) => <li key={subject.id} className="flex items-center justify-between gap-3 py-3">
        <Link href={subjectDetailsPath(subject.id)} className="min-w-0 break-words text-sm font-medium underline underline-offset-4">{subject.title}</Link><Badge variant="outline">{subject.grade}</Badge>
      </li>)}</ul> : <p className="mt-4 text-sm text-muted">{current.some((subject) => subject.grade !== null) ? "Оценок ниже B+ нет." : "Пока нет оценок для сравнения."}</p>}
      <h3 className="mt-6 text-sm font-semibold">Без оценки</h3>
      <p className="mt-2 break-words text-sm leading-6 text-muted">{ungraded.length ? ungraded.map((subject) => subject.title).join(", ") : "Все предметы этого семестра оценены."}</p>
    </Card>
    <GradeForecast />
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 className="text-lg font-semibold">Личный учебный план</h2><Link href="/subjects" className={buttonStyles("secondary")}>Мои предметы</Link></div>
      {current.length ? <StudyPlanList subjects={current} /> : <p className="text-sm text-muted">Нет предметов в выбранном семестре.</p>}
      <Link href="/setup" className={buttonStyles("ghost") + " mt-4"}>Подобрать предметы</Link>
    </Card>
  </div>;
}
