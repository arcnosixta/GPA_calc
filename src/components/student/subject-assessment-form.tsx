"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { academicCalendars, type AcademicCalendarId } from "@/lib/academic-calendar";
import { gradeFromScore, gradeScaleSource, isAssessmentScore } from "./integration-adapter";
import type { SubjectAssessment } from "./personal-plan";

const emptyScores: SubjectAssessment = { rk1: null, rk2: null, exam: null, finalScore: null };

type AssessmentFormProps = {
  subjectId: string;
  calendarId: AcademicCalendarId;
  assessment?: SubjectAssessment;
  onSave: (assessment: SubjectAssessment) => void;
};

export function SubjectAssessmentForm({ subjectId, calendarId, assessment, onSave }: AssessmentFormProps) {
  const [status, setStatus] = useState("");
  const calendar = academicCalendars[calendarId];
  const scores = assessment ?? emptyScores;
  const fields = [
    { name: "rk1", label: "Рубежный контроль 1", hint: calendar.rk1Weeks },
    { name: "rk2", label: "Рубежный контроль 2", hint: calendar.rk2Weeks },
    { name: "exam", label: "Экзамен", hint: "Баллы за итоговый контроль" },
    { name: "finalScore", label: "Итоговый балл по ведомости", hint: "Целый балл от 0 до 100" },
  ] as const;
  const snapshotKey = fields.map(({ name }) => scores[name] ?? "").join("|");

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

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Рубежные контроли и экзамен</h2>
      <p className="text-sm leading-6 text-muted">
        Запишите баллы за контроли и экзамен. Для GPA используется итоговая оценка из ведомости.
        Если у вас есть итоговый балл, приложение переведёт его в буквенную оценку.
      </p>
      <form key={snapshotKey} onSubmit={submit} onChange={() => setStatus("")} className="space-y-4">
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
        <Button type="submit">Сохранить баллы</Button>
      </form>
      <p role="status" className="text-sm text-muted">{status}</p>
      <p className="text-sm">
        <a className="underline underline-offset-4" href={gradeScaleSource}>Общая шкала оценивания в Казахстане</a>
      </p>
    </Card>
  );
}
