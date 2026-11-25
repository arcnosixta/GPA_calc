"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { createSemester, managementErrorMessage, readCatalog, saveSemester } from "@/lib/data/catalog";
import type { Account } from "@/lib/data/profile";
import type { Tables } from "@/lib/database";
import { DatabaseCalendars } from "./database-calendars";

type Catalog = Awaited<ReturnType<typeof readCatalog>>;

export function DatabaseSemesters({ account }: { account: Account }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [chosen, setChosen] = useState(1);
  useEffect(() => {
    let active = true;
    readCatalog().then((data) => { if (active) setCatalog(data); })
      .catch((error) => { if (active) setError(managementErrorMessage(error)); });
    return () => { active = false; };
  }, [attempt]);
  if (account.role === "student") return <EmptyState title="Редактирование семестров недоступно" description="Студент просматривает календарь своего вуза в учебном пространстве." />;
  if (error) return <Card className="space-y-4"><p role="alert">{error}</p><Button onClick={() => { setError(""); setCatalog(null); setAttempt(attempt + 1); }}>Повторить загрузку семестров</Button></Card>;
  if (!catalog) return <p role="status">Загружаем семестры из базы…</p>;
  const selected = catalog.semesters.find((item) => item.number === chosen) ?? catalog.semesters[0];
  const missing = Array.from({ length: 8 }, (_, index) => index + 1).filter((number) => !catalog.semesters.some((item) => item.number === number));
  function saved(semester: Tables<"semesters">) {
    setCatalog((current) => current && { ...current, semesters: [...current.semesters.filter((item) => item.number !== semester.number), semester].sort((a, b) => a.number - b.number) });
  }
  return <div className="min-w-0 space-y-6"><PageHeader eyebrow="Структура обучения" title="Семестры" description="Сроки календаря, названия и доступность семестров из общей базы данных." /><DatabaseCalendars account={account} catalog={catalog} />
    <section className="space-y-4" aria-labelledby="database-semesters-title"><h2 id="database-semesters-title" className="text-xl font-semibold">Справочник семестров</h2><p className="text-sm text-muted">Закрытие семестра запрещает новые записи плана. Уже сохранённые предметы, кредиты и оценки остаются в личных записях.</p>
      {!catalog.semesters.length ? <EmptyState title="Семестры пока не добавлены" description="Администратор может добавить семестр в справочник." /> : <div className="grid gap-4 sm:grid-cols-2">{catalog.semesters.map((semester) => <Card key={semester.number} className="space-y-3"><h3 className="wrap-anywhere font-semibold">{semester.number}. {semester.title}</h3><Badge variant="outline">{semester.is_active ? "Открыт" : "Закрыт для новых планов"}</Badge></Card>)}</div>}
      {account.role === "admin" && <>
        {selected && <Card className="space-y-4"><h3 className="font-semibold">Изменить семестр</h3><Field label="Семестр для изменения" htmlFor="db-semester-number"><Select id="db-semester-number" value={selected.number} onChange={(event) => setChosen(Number(event.target.value))}>{catalog.semesters.map((semester) => <option key={semester.number} value={semester.number}>{semester.number} · {semester.title}</option>)}</Select></Field><SemesterForm key={selected.number} semester={selected} onSaved={saved} /></Card>}
        {missing.length > 0 && <Card><SemesterForm key={`new-${missing.join("-")}`} missing={missing} onSaved={saved} /></Card>}
      </>}
    </section>
  </div>;
}

function SemesterForm({ semester, missing, onSaved }: { semester?: Tables<"semesters">; missing?: number[]; onSaved: (value: Tables<"semesters">) => void }) {
  const [number, setNumber] = useState(semester?.number ?? missing?.[0] ?? 1);
  const [title, setTitle] = useState(semester?.title ?? "");
  const [active, setActive] = useState(semester?.is_active ?? true);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const prefix = semester ? "edit-db-semester" : "new-db-semester";
  return <form noValidate className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const saved = semester ? await saveSemester(number, { title, is_active: active }) : await createSemester({ number, title, is_active: active });
      onSaved(saved); setTitle(saved.title); setActive(saved.is_active); setMessage("Семестр сохранён в базе.");
    } catch (error) { setError(managementErrorMessage(error)); } finally { setBusy(false); }
  }}>
    {!semester && <h3 className="font-semibold">Добавить семестр</h3>}
    <fieldset disabled={busy} className="space-y-4">
      {!semester && <Field label="Номер нового семестра" htmlFor={`${prefix}-number`}><Select id={`${prefix}-number`} value={number} onChange={(event) => setNumber(Number(event.target.value))}>{missing?.map((value) => <option key={value} value={value}>{value}</option>)}</Select></Field>}
      <Field label="Название семестра" htmlFor={`${prefix}-title`} error={error}><Input id={`${prefix}-title`} value={title} required maxLength={60} aria-invalid={Boolean(error)} aria-describedby={error ? `${prefix}-title-error` : undefined} onChange={(event) => { setTitle(event.target.value); setError(""); setMessage(""); }} /></Field>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={active} onChange={(event) => { setActive(event.target.checked); setError(""); setMessage(""); }} className="size-4 accent-black" />Доступен для новых планов</label>
    </fieldset>
    <Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : semester ? "Сохранить семестр" : "Добавить семестр"}</Button><p role="status" className="text-sm text-muted">{message}</p>
  </form>;
}
