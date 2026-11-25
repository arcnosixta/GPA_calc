"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { dataErrorMessage } from "@/lib/data/errors";
import type { LetterGrade } from "@/lib/database";
import { saveAssessment, saveForecast, type StudentResult } from "@/lib/data/student";
import { calculateAssessmentResult, gradeOptions, type SubjectAssessment } from "./integration-adapter";

export function SupabaseAssessment({ result, forecast, onSaved }: { result: StudentResult; forecast?: LetterGrade; onSaved: () => Promise<void> }) {
  const [scores, setScores] = useState<SubjectAssessment>({ rk1: result.rk1, rk2: result.rk2, exam: result.exam });
  const [grade, setGrade] = useState<LetterGrade | "">(forecast ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const preview = calculateAssessmentResult(scores);
  async function save(event: FormEvent<HTMLFormElement>, kind: "assessment" | "forecast") {
    event.preventDefault();
    if (busy || !result.id) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (kind === "assessment") {
        const saved = await saveAssessment(result.id, scores);
        setScores({ rk1: saved.rk1, rk2: saved.rk2, exam: saved.exam });
      } else await saveForecast(result.id, grade || null);
      await onSaved();
      setMessage(kind === "assessment" ? "Баллы сохранены в аккаунте. Итог перечитан из базы." : "Прогноз сохранён отдельно от результатов.");
    } catch (error) { setError(dataErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <Card><form className="space-y-4" onSubmit={(event) => save(event, "assessment")}>
      <h2 className="text-lg font-semibold">Баллы</h2>
      <p className="text-sm text-muted">Пустое поле — балл ещё не известен. Ноль — полученный результат. Итог: РК1 × 30% + РК2 × 30% + экзамен × 40%.</p>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-3">
        {(["rk1", "rk2", "exam"] as const).map((key) => <Field key={key} htmlFor={key} label={{ rk1: "РК1", rk2: "РК2", exam: "Экзамен" }[key]}>
          <Input id={key} type="number" min={0} max={100} step="any" value={scores[key] ?? ""} onChange={(event) => { setScores({ ...scores, [key]: event.target.value === "" ? null : Number(event.target.value) }); setMessage(""); }} />
        </Field>)}
      </fieldset>
      <p aria-live="polite">Предпросмотр: {preview ? `${preview.score} · ${preview.grade}` : "заполните все три балла"}</p>
      <p>Сохранённый результат: {result.final_score ?? "—"} · {result.grade ?? "без оценки"}</p>
      <Button type="submit" disabled={busy}>Сохранить баллы</Button>
    </form></Card>
    <Card><form className="space-y-4" onSubmit={(event) => save(event, "forecast")}>
      <h2 className="text-lg font-semibold">Прогноз</h2>
      <Field htmlFor="forecast" label="Ожидаемая оценка"><Select id="forecast" value={grade} disabled={busy} onChange={(event) => { setGrade(event.target.value as LetterGrade | ""); setMessage(""); }}>
        <option value="">Без предположения</option>{gradeOptions.map((item) => <option key={item}>{item}</option>)}
      </Select></Field>
      <Button type="submit" disabled={busy}>Сохранить прогноз</Button>
    </form></Card>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </div>;
}
