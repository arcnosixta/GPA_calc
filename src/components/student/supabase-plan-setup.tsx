"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Field, Select } from "@/components/ui";
import { dataErrorMessage, invalid } from "@/lib/data/errors";
import { addSubject, type StudyData } from "@/lib/data/student";

export function SupabasePlanSetup({ data, year, groupId, onSaved }: { data: StudyData; year: string; groupId: string; onSaved: () => Promise<void> }) {
  const [semester, setSemester] = useState(String(data.semesters[0]?.number ?? ""));
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const groupItems = data.plans.filter((item) => item.group_id === groupId && item.semester === Number(semester) && data.subjects.some((subject) => subject.id === item.subject_id));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (!subject) invalid("Выберите предмет.");
      await addSubject(subject, year, Number(semester));
      await onSaved();
      setMessage("Предмет есть в вашем плане. Повторное добавление не создаёт копию.");
    } catch (error) { setError(dataErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <Card><form onSubmit={save} className="space-y-4">
    <h2 className="text-lg font-semibold">Добавить предмет · {year}</h2>
    <Field htmlFor="plan-semester" label="Семестр"><Select id="plan-semester" value={semester} disabled={busy} required onChange={(event) => setSemester(event.target.value)}>
      {data.semesters.map((item) => <option key={item.number} value={item.number}>{item.title}</option>)}
    </Select></Field>
    <Field htmlFor="plan-subject" label="Предмет из опубликованного каталога"><Select id="plan-subject" value={subject} disabled={busy} required onChange={(event) => setSubject(event.target.value)}>
      <option value="">Выберите предмет</option>{data.subjects.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.credits} кр.</option>)}
    </Select></Field>
    <Button type="submit" disabled={busy || !data.semesters.length || !data.subjects.length}>{busy ? "Сохраняем…" : "Добавить в план"}</Button>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <h3 className="font-semibold">Рекомендации вашей группы</h3>
    <p className="text-sm text-muted">Выберите предмет ниже и подтвердите добавление. Уже сохранённые предметы и оценки сохраняются при смене группы.</p>
    {groupItems.length ? <ul className="space-y-2">{groupItems.map((item) => <li key={item.subject_id}><Button variant="secondary" className="max-w-full whitespace-normal text-left" disabled={busy} onClick={() => setSubject(item.subject_id)}>{data.subjects.find((subject) => subject.id === item.subject_id)?.title}</Button></li>)}</ul> : <p>Для этого семестра групповой план пока не заполнен. Выберите предмет вручную.</p>}
  </form></Card>;
}
