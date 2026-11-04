"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { getManagedGroupIds, updateSemester, useDemoCatalog, type CatalogSemester } from "@/lib/demo-catalog";
import { useDemoSession, type DemoSession } from "@/lib/demo-session";

export function SemestersManager() {
  const catalog = useDemoCatalog();
  const session = useDemoSession();
  const [number, setNumber] = useState(1);
  if (!session) return <p role="status">{session === undefined ? "Загружаем демосеанс…" : "Войдите в демосеанс."}</p>;
  if (session.role === "student") return <p>Изменение семестров недоступно студенту.</p>;
  const groupIds = getManagedGroupIds(session, catalog);
  const selected = catalog.semesters.find((semester) => semester.number === number);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader eyebrow="Структура обучения" title="Семестры" description="Восемь семестров и их связи с учебными планами. Настройки меняются только в текущей вкладке." />
      <p className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
        Администратор меняет название и доступность семестра для новых планов. Модератор видит предметы и планы назначенных групп.
        Закрытие семестра не удаляет существующие планы и архив успеваемости.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {catalog.semesters.map((semester) => {
          const subjects = catalog.subjects.filter((subject) => subject.semester === semester.number && groupIds.includes(subject.groupId));
          const plans = catalog.studyPlans.filter((plan) => plan.semester === semester.number && groupIds.includes(plan.groupId));
          return <Card key={semester.number} className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h2 className="wrap-anywhere text-base font-semibold">{semester.number}. {semester.title}</h2>
              <Badge variant="outline">{semester.active ? "Открыт" : "Закрыт для новых планов"}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted">Предметов в доступном каталоге: {subjects.length}. Кредитов: {subjects.reduce((total, subject) => total + subject.credits, 0)}. Планов групп: {plans.length}.</p>
          </Card>;
        })}
      </div>
      {session.role === "admin" && selected && <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Настройка семестра</h2>
        <Field label="Семестр для изменения" htmlFor="semester-number">
          <Select id="semester-number" value={number} onChange={(event) => setNumber(Number(event.target.value))}>
            {catalog.semesters.map((semester) => <option key={semester.number} value={semester.number}>{semester.number} · {semester.title}</option>)}
          </Select>
        </Field>
        <SemesterEditor key={selected.number} semester={selected} session={session} />
      </Card>}
    </div>
  );
}

function SemesterEditor({ semester, session }: { semester: CatalogSemester; session: DemoSession }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    setMessage("");
    if (!title || title.length > 60) {
      setError("Введите название от 1 до 60 символов.");
      (form.elements.namedItem("title") as HTMLInputElement).focus();
      return;
    }
    const result = updateSemester(session, semester.number, { title, active: data.has("active") });
    setError(result.ok ? "" : result.error ?? "Не удалось изменить семестр.");
    if (result.ok) setMessage("Настройки семестра изменены локально в этой вкладке.");
  }

  return <form noValidate onSubmit={submit} onChange={() => { setError(""); setMessage(""); }} className="space-y-4">
    <Field label="Название семестра" htmlFor="semester-title" error={error}>
      <Input id="semester-title" name="title" defaultValue={semester.title} required maxLength={60}
        aria-invalid={Boolean(error)} aria-describedby={error ? "semester-title-error" : undefined} />
    </Field>
    <label className="flex min-h-11 items-center gap-4 text-sm">
      <input type="checkbox" name="active" defaultChecked={semester.active} className="size-4 shrink-0 accent-black" />
      Доступен для новых учебных планов
    </label>
    <Button type="submit">Применить локально</Button>
    <p role="status" className="text-sm leading-6 text-muted">{message}</p>
  </form>;
}
