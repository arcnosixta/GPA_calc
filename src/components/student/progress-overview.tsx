"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Card, Field, PageHeader, Select, buttonStyles } from "@/components/ui";
import { academicCalendars } from "@/lib/academic-calendar";
import { subjectDetailsPath } from "@/lib/site-routes";
import { calculateGpa } from "./integration-adapter";
import { usePersonalPlan } from "./personal-plan";
import { SessionState } from "./session-state";

function academicYearLabel() {
  const now = new Date();
  const start = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}–${start + 1}`;
}

function assessmentValue(score: number | null | undefined) {
  return score == null ? "Оценка ещё не внесена" : `${score} из 100`;
}

export function ProgressOverview() {
  const { session, catalog, subjects, calendarId, assessments } = usePersonalPlan();
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  if (!session?.profile) return <SessionState session={session} />;

  const profile = session.profile;
  const group = catalog.groups.find((item) => item.id === profile.groupId);
  const university = catalog.universities.find((item) => item.id === profile.universityId);
  const course = group?.year ?? Math.max(1, ...subjects.map((subject) => Math.ceil(subject.semester / 2)));
  const semesters = [course * 2 - 1, course * 2];
  const semester = selectedSemester ?? semesters[0];
  const currentSubjects = subjects.filter((subject) => subject.semester === semester);
  const calendar = academicCalendars[calendarId];
  const semesterGpa = calculateGpa(currentSubjects);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader eyebrow="Моё обучение" title="Учебный прогресс"
        description={`${academicYearLabel()} учебный год · ${course} курс · ${university?.name ?? "Вуз не указан"}`} />

      <Card className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Учебный год</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Выберите семестр, чтобы посмотреть контрольные точки и оценки по предметам.</p>
        </div>
        <Field label="Семестр" htmlFor="progress-semester">
          <Select id="progress-semester" value={semester} onChange={(event) => setSelectedSemester(Number(event.target.value))}>
            <option value={semesters[0]}>Осенний семестр · {semesters[0]}</option>
            <option value={semesters[1]}>Весенний семестр · {semesters[1]}</option>
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          {semesters.map((number, index) => {
            const title = index === 0 ? "Осенний семестр" : "Весенний семестр";
            const active = number === semester;
            return (
              <button key={number} type="button" aria-pressed={active} onClick={() => setSelectedSemester(number)}
                className={`min-w-0 rounded-lg border p-4 text-left transition-colors hover:bg-surface-muted ${active ? "border-primary bg-surface-muted" : "border-border bg-background"}`}>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{title}</span>
                  <Badge variant="outline">{number} семестр</Badge>
                  {active && <Badge>Выбран</Badge>}
                </span>
                <span className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted">РК1</span><span className="font-medium">{calendar.rk1Weeks}</span>
                  <span className="text-muted">РК2</span><span className="font-medium">{calendar.rk2Weeks}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="space-y-2 text-sm leading-6 text-muted">
          <p>Расписание: {calendar.label}. Вуз может уточнять даты и формат контроля.</p>
          {calendar.source ? (
            <p><a href={calendar.source.url} className="underline decoration-border underline-offset-4 hover:decoration-current">Источник календаря: {calendar.source.label}</a></p>
          ) : (
            <p>Это пример расписания для ориентира: календарь выбранного вуза не подключён.</p>
          )}
        </div>
      </Card>

      <Card aria-live="polite" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">GPA семестра · по итоговым оценкам</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{semesterGpa?.toFixed(2) ?? "—"}</p>
        </div>
        <Badge variant="outline">{semester} семестр</Badge>
      </Card>

      <section aria-labelledby="progress-subjects-title" className="space-y-4">
        <div>
          <h2 id="progress-subjects-title" className="text-xl font-semibold">Предметы · {semester} семестр</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Баллы РК и итоговую буквенную оценку можно изменить в карточке предмета.</p>
        </div>
        {currentSubjects.length ? currentSubjects.map((subject) => {
          const assessment = assessments[subject.id];
          return (
            <Card key={subject.id} className="min-w-0 space-y-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted">{subject.code} · {subject.credits} кр.</p>
                  <h3 className="mt-1 break-words text-lg font-semibold">{subject.title}</h3>
                </div>
                <Link href={subjectDetailsPath(subject.id)} className={buttonStyles("secondary")}>Оценки предмета</Link>
              </div>
              <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-border bg-background p-3">
                  <dt className="text-sm text-muted">РК1 · {calendar.rk1Weeks}</dt>
                  <dd className="mt-1 break-words text-sm font-medium">{assessmentValue(assessment?.rk1)}</dd>
                </div>
                <div className="min-w-0 rounded-lg border border-border bg-background p-3">
                  <dt className="text-sm text-muted">РК2 · {calendar.rk2Weeks}</dt>
                  <dd className="mt-1 break-words text-sm font-medium">{assessmentValue(assessment?.rk2)}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                <span className="text-sm text-muted">Итоговая буквенная оценка</span>
                <Badge variant={subject.grade === null ? "outline" : "strong"}>{subject.grade ?? "Ещё не выставлена"}</Badge>
              </div>
            </Card>
          );
        }) : (
          <Card>
            <h3 className="font-semibold">В этом семестре пока нет предметов</h3>
            <p className="mt-2 text-sm leading-6 text-muted">Предметы появятся здесь после добавления в личный учебный план.</p>
            <Link href="/setup" className={buttonStyles("secondary") + " mt-4"}>Подобрать предметы</Link>
          </Card>
        )}
      </section>
    </div>
  );
}
