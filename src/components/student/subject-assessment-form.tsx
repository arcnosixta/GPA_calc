"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { academicCalendars, type AcademicCalendarId } from "@/lib/academic-calendar";
import type { Subject } from "@/lib/types";
import { assessmentWeights, calculateAssessmentResult, gradePoints, gradeScaleSource, isAssessmentScore, sameAssessmentScores, type SubjectAssessment } from "./integration-adapter";

const emptyScores: SubjectAssessment = { rk1: null, rk2: null, exam: null };

type AssessmentFormProps = {
  subject: Subject;
  otherGradedCredits: number;
  calendarId: AcademicCalendarId;
  assessment?: SubjectAssessment;
  onSave: (assessment: SubjectAssessment) => void;
};

export function SubjectAssessmentForm({ assessment, ...props }: AssessmentFormProps) {
  const [status, setStatus] = useState("");
  const scores = assessment ?? emptyScores;
  const snapshotKey = [scores.rk1, scores.rk2, scores.exam].join("|");

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Баллы и итоговая оценка</h2>
      <p className="text-sm leading-6 text-muted">
        Введите три балла от 0 до 100. Формула демоверсии округляет итоговый балл до целого и переводит его в буквенную оценку.
      </p>
      <AssessmentFields key={snapshotKey} {...props} scores={scores} status={status} setStatus={setStatus} />
      <p className="text-sm">
        <a className="underline underline-offset-4" href={gradeScaleSource}>Общая шкала оценивания в Казахстане</a>
      </p>
    </Card>
  );
}

function readScore(form: HTMLFormElement, name: keyof SubjectAssessment) {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement)) return null;
  if (input.validity.badInput) return NaN;
  return input.value === "" ? null : input.valueAsNumber;
}

function readScores(form: HTMLFormElement): SubjectAssessment {
  return { rk1: readScore(form, "rk1"), rk2: readScore(form, "rk2"), exam: readScore(form, "exam") };
}

function AssessmentFields({ subject, otherGradedCredits, calendarId, scores, onSave, status, setStatus }: Omit<AssessmentFormProps, "assessment"> & {
  scores: SubjectAssessment;
  status: string;
  setStatus: (message: string) => void;
}) {
  const [draft, setDraft] = useState<SubjectAssessment | null>(null);
  const calendar = academicCalendars[calendarId];
  const fields = [
    { name: "rk1", label: "Рубежный контроль 1", hint: `${assessmentWeights.rk1}% итогового балла · ${calendar.rk1Weeks}` },
    { name: "rk2", label: "Рубежный контроль 2", hint: `${assessmentWeights.rk2}% итогового балла · ${calendar.rk2Weeks}` },
    { name: "exam", label: "Экзамен", hint: `${assessmentWeights.exam}% итогового балла` },
  ] as const;
  const currentScores = draft ?? scores;
  const hasChanges = !sameAssessmentScores(currentScores, scores);
  const result = calculateAssessmentResult(currentScores);
  const grade = result?.grade ?? (hasChanges ? null : subject.grade);
  const points = grade === null ? null : gradePoints[grade];
  const weightedPoints = points === null ? null : points * subject.credits;
  const contribution = weightedPoints === null ? null : weightedPoints / (otherGradedCredits + subject.credits);
  const metrics = [
    { title: "Кредиты", value: subject.credits },
    { title: "Балл GPA по предмету", value: points?.toFixed(2) ?? "—" },
    { title: "Взвешенные баллы", value: weightedPoints?.toFixed(2) ?? "—", hint: "Балл GPA × кредиты предмета" },
    { title: "Вклад в общий GPA", value: contribution?.toFixed(2) ?? "—", hint: "Взвешенные баллы ÷ кредиты всех оценённых предметов" },
  ];
  const resultLabelId = `assessment-${subject.id}-result-label`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = readScores(event.currentTarget);
    if (sameAssessmentScores(next, scores)) return;
    if (Object.values(next).some((score) => score !== null && !isAssessmentScore(score))) {
      setStatus("Проверьте баллы. Допустимы значения от 0 до 100.");
      return;
    }
    onSave(next);
    setDraft(null);
    setStatus("Баллы сохранены в этом браузере.");
  }

  return (
    <form onSubmit={submit} onChange={(event) => {
      setDraft(readScores(event.currentTarget));
      setStatus("");
    }} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {fields.map(({ name, label, hint }) => {
          const id = `assessment-${subject.id}-${name}`;
          return (
            <Field key={name} label={label} htmlFor={id} hint={hint}>
              <Input id={id} name={name} type="number" min={0} max={100} step="any"
                defaultValue={scores[name] ?? ""} aria-describedby={id + "-hint"} />
            </Field>
          );
        })}
      </div>
      <div className="rounded-lg border border-border bg-surface-muted p-4">
        <p id={resultLabelId} className="text-sm font-medium">Итоговая оценка</p>
        <output aria-labelledby={resultLabelId} className="mt-1 block text-2xl font-semibold tabular-nums">
          {result ? `${result.grade} · ${result.score} из 100` : grade ?? "—"}
        </output>
        {result === null && <p className="mt-1 text-sm text-muted">
          {grade === null ? "Итог появится после ввода всех трёх баллов." : "Оценка из ранее сохранённого учебного плана."}
        </p>}
      </div>
      <dl aria-label="Расчёт GPA по предмету" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ title, value, hint }) => (
          <div key={title} className="rounded-lg border border-border p-4">
            <dt className="text-sm text-muted">{title}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
            {hint && <dd className="mt-2 text-xs text-muted">{hint}</dd>}
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!hasChanges}>Сохранить баллы</Button>
        <p role="status" className="text-sm text-muted">{status}</p>
      </div>
    </form>
  );
}
