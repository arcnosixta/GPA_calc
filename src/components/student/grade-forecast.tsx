"use client";

import { Button, Card, Field, Select } from "@/components/ui";
import type { Grade } from "@/lib/types";
import { calculateGpa, gradeOptions } from "./integration-adapter";
import { usePersonalPlan } from "./personal-plan";

export function GradeForecast() {
  const { subjects, forecast: assumptions, setForecastGrade, resetForecast } = usePersonalPlan();
  const specified = subjects.filter((subject) => assumptions[subject.id] !== undefined);
  const forecast = subjects.map((subject) => ({ ...subject, grade: assumptions[subject.id] ?? subject.grade }));
  const pending = forecast.filter((subject) => subject.grade === null).length;
  return <Card>
    <h2 className="text-lg font-semibold">Прогноз GPA</h2>
    <p className="mt-2 text-sm leading-6 text-muted">Задайте предполагаемые оценки. Браузер хранит прогноз отдельно от оценок личного плана.</p>
    {subjects.length ? <div className="mt-6 space-y-4">
      {subjects.map((subject) => <div key={subject.id} className="grid min-w-0 gap-3 border-t border-border pt-4 sm:grid-cols-2 sm:items-end">
        <div className="min-w-0 text-sm"><p className="break-words font-medium">{subject.title}</p><p className="mt-1 text-xs leading-5 text-muted">{subject.semester} семестр · Кредиты: {subject.credits} · Исходная оценка: {subject.grade ?? "Без оценки"}</p></div>
        <Field label={`Предположение: ${subject.code}`} htmlFor={`forecast-${subject.id}`}>
          <Select id={`forecast-${subject.id}`} value={assumptions[subject.id] ?? ""} onChange={(event) => {
            setForecastGrade(subject.id, (event.target.value || null) as Grade | null);
          }}>
            <option value="">Без предположения</option>
            {gradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
          </Select>
        </Field>
      </div>)}
      <div role="status" className="rounded-lg bg-surface-muted p-4 text-sm leading-6">
        {specified.length ? <><p className="font-semibold">Прогноз общего GPA: {calculateGpa(forecast)?.toFixed(2) ?? "—"}</p><p>Предположения: {specified.map((subject) => `${subject.code}: ${assumptions[subject.id]}`).join(", ")}.</p>{pending > 0 && <p>Предметов без оценки и предположения: {pending}. Они исключены из прогноза.</p>}</> : <p>Выберите хотя бы одну предполагаемую оценку, чтобы увидеть прогноз.</p>}
      </div>
      <Button variant="secondary" disabled={!specified.length} onClick={resetForecast}>Сбросить прогноз</Button>
    </div> : <p className="mt-4 text-sm text-muted">Добавьте предметы в личный план для прогноза.</p>}
  </Card>;
}
