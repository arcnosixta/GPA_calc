"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { academicCalendars, type AcademicCalendarId } from "@/lib/academic-calendar";
import { calculateRkResult, gradeFromScore, gradeScaleSource, isAssessmentScore } from "./integration-adapter";
import type { SubjectAssessment } from "./personal-plan";

const emptyScores: SubjectAssessment = { rk1: null, rk2: null, exam: null, finalScore: null };

type AssessmentFormProps = {
  subjectId: string;
  calendarId: AcademicCalendarId;
  assessment?: SubjectAssessment;
  onSave: (assessment: SubjectAssessment) => void;
};

export function SubjectAssessmentForm({ assessment, ...props }: AssessmentFormProps) {
  const [status, setStatus] = useState("");
  const scores = assessment ?? emptyScores;
  const snapshotKey = [scores.rk1, scores.rk2, scores.exam, scores.finalScore].join("|");

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Рубежные контроли и экзамен</h2>
      <p className="text-sm leading-6 text-muted">Введите баллы РК, чтобы сразу увидеть текущую оценку. Для GPA используется итоговая оценка.</p>
      <AssessmentFields key={snapshotKey} {...props} scores={scores} setStatus={setStatus} />
      <p role="status" className="text-sm text-muted">{status}</p>
      <p className="text-sm">
        <a className="underline underline-offset-4" href={gradeScaleSource}>Общая шкала оценивания в Казахстане</a>
      </p>
    </Card>
  );
}

function readRkScore(form: HTMLFormElement, name: "rk1" | "rk2") {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement)) return null;
  if (input.validity.badInput) return NaN;
  return input.value === "" ? null : input.valueAsNumber;
}

function AssessmentFields({ subjectId, calendarId, scores, onSave, setStatus }: Omit<AssessmentFormProps, "assessment"> & {
  scores: SubjectAssessment;
  setStatus: (message: string) => void;
}) {
  const [rkResult, setRkResult] = useState(() => calculateRkResult(scores.rk1, scores.rk2));
  const calendar = academicCalendars[calendarId];
  const fields = [
    { name: "rk1", label: "Рубежный контроль 1", hint: calendar.rk1Weeks },
    { name: "rk2", label: "Рубежный контроль 2", hint: calendar.rk2Weeks },
    { name: "exam", label: "Экзамен", hint: "Баллы за итоговый контроль" },
    { name: "finalScore", label: "Итоговый балл по ведомости", hint: "Целый балл от 0 до 100" },
  ] as const;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = { ...emptyScores };
    for (const { name } of fields) {
      const input = String(data.get(name) ?? "").trim();
      if (!input) continue;
      const score = Number(input);
      if (!isAssessmentScore(score) || (name === "finalScore" && gradeFromScore(score) === null)) {
        setStatus("Проверьте баллы. Допустимы значения от 0 до 100, итоговый балл должен быть целым.");
        return;
      }
      next[name] = score;
    }
    onSave(next);
    setStatus("Баллы сохранены в этом браузере.");
  }

  function updatePreview(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    setRkResult(calculateRkResult(readRkScore(form, "rk1"), readRkScore(form, "rk2")));
    setStatus("");
  }

  return (
    <form onSubmit={submit} onChange={updatePreview} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ name, label, hint }) => {
          const id = `assessment-${subjectId}-${name}`;
          return (
            <Field key={name} label={label} htmlFor={id} hint={hint}>
              <Input id={id} name={name} type="number" min={0} max={100}
                step={name === "finalScore" ? 1 : "any"} defaultValue={scores[name] ?? ""}
                aria-describedby={id + "-hint"} />
            </Field>
          );
        })}
      </div>
      <div className="rounded-lg border border-border bg-surface-muted p-4 text-sm">
        <p className="font-semibold" id={`assessment-${subjectId}-rk-label`}>Текущая оценка по РК</p>
        <output aria-labelledby={`assessment-${subjectId}-rk-label`} className="mt-1 block font-semibold tabular-nums">
          {rkResult ? `${rkResult.grade} · ${rkResult.score} из 100` : "—"}
        </output>
        <p className="mt-1 text-muted">Средний балл по введённым РК1 и РК2 с округлением до целого.</p>
      </div>
      <Button type="submit">Сохранить баллы</Button>
    </form>
  );
}
