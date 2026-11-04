"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, buttonStyles } from "@/components/ui";
import { getManagedGroupIds, saveGroup, useDemoCatalog } from "@/lib/demo-catalog";
import { useDemoSession } from "@/lib/demo-session";

export function GroupsManager() {
  const session = useDemoSession();
  const catalog = useDemoCatalog();
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState("");
  const [programId, setProgramId] = useState("");
  const [year, setYear] = useState("1");
  const [errors, setErrors] = useState<{ name?: string; programId?: string; year?: string; form?: string }>({});
  const [status, setStatus] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const allowedIds = getManagedGroupIds(session, catalog);
  const groups = catalog.groups.filter((group) => allowedIds.includes(group.id));

  function focusName() {
    const field = formRef.current?.elements.namedItem("name");
    if (field instanceof HTMLElement) field.focus();
  }

  function clearForm() {
    setEditingId(undefined); setName(""); setProgramId(""); setYear("1"); setErrors({});
    focusName();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    const nextErrors: typeof errors = {};
    const program = catalog.programs.find((item) => item.id === programId);
    if (!name.trim() || name.trim().length > 60) nextErrors.name = "Введите название группы от 1 до 60 символов.";
    else if (catalog.groups.some((group) => group.id !== editingId && group.universityId === program?.universityId && group.name.toLowerCase() === name.trim().toLowerCase())) {
      nextErrors.name = "В этом вузе уже есть группа с таким названием.";
    }
    if (!program) nextErrors.programId = "Выберите направление из списка.";
    if (!Number.isInteger(Number(year)) || Number(year) < 1 || Number(year) > 6) nextErrors.year = "Введите целый номер курса от 1 до 6.";
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      const field = event.currentTarget.elements.namedItem(firstError);
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    const result = saveGroup(session, { name: name.trim(), programId, year: Number(year) }, editingId);
    if (!result.ok) {
      setErrors({ form: result.error ?? "Не удалось изменить демокаталог." });
      event.currentTarget.focus();
      return;
    }
    setStatus(editingId ? "Группа изменена в этой вкладке." : "Группа добавлена в демокаталог этой вкладки.");
    clearForm();
  }

  if (session === undefined) return <p role="status">Загружаем демосеанс…</p>;
  if (!session || session.role === "student") return null;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Учебные группы" eyebrow="Учебные справочники"
        description="Группы связаны с направлением, вузом и предметами. Изменения относятся только к демокаталогу текущей вкладки."
        action={<Badge variant="outline">Демокаталог</Badge>} />
      <p className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6">
        {session.role === "admin"
          ? "Администратор создаёт и редактирует группы. Назначить модераторов можно в разделе «Пользователи и роли»."
          : "Показаны назначенные демомодератору группы. Создание групп и назначение модераторов доступны администратору."}
      </p>
      <nav aria-label="Связанные разделы групп" className="flex flex-wrap gap-4">
        <Link href="/management/study-plans" className={buttonStyles("secondary")}>Учебные планы</Link>
        <Link href="/management/programs" className={buttonStyles("secondary")}>Направления</Link>
        {session.role === "admin" && <Link href="/management/users" className={buttonStyles("secondary")}>Пользователи и роли</Link>}
      </nav>
      {groups.length === 0 ? <EmptyState title="Нет доступных групп"
        description={session.role === "admin" ? "Добавьте группу с помощью формы ниже." : "Администратор может назначить группы демомодератору в разделе пользователей."} /> : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {groups.map((group) => {
            const moderators = catalog.users.filter((user) => user.role === "moderator" && user.groupIds.includes(group.id));
            return <Card key={group.id} className="min-w-0 space-y-4">
              <h2 className="wrap-anywhere text-lg font-semibold">{group.name}</h2>
              <p className="wrap-anywhere text-sm leading-6 text-muted">{group.program}<br />{catalog.universities.find((item) => item.id === group.universityId)?.name}</p>
              <p className="text-sm">Курс: {group.year} · Активных предметов в планах: {group.subjectCount}</p>
              <p className="wrap-anywhere text-sm leading-6 text-muted">Модераторы: {moderators.length ? moderators.map((user) => user.name).join(", ") : "не назначены"}</p>
              {session.role === "admin" && <Button variant="secondary" aria-label={"Редактировать группу: " + group.name} onClick={() => {
                setEditingId(group.id); setName(group.name); setProgramId(group.programId); setYear(String(group.year)); setErrors({}); setStatus(""); focusName();
              }}>Редактировать</Button>}
            </Card>;
          })}
        </div>
      )}
      {session.role === "admin" && (catalog.programs.length === 0 ? (
        <p className="text-sm text-muted">Сначала создайте направление, чтобы привязать к нему группу.</p>
      ) : (
        <Card>
          <h2 id="group-form-title" className="text-lg font-semibold">{editingId ? "Редактирование группы" : "Новая группа"}</h2>
          <form ref={formRef} noValidate onSubmit={submit} aria-labelledby="group-form-title"
            tabIndex={-1} aria-describedby={errors.form ? "group-form-error" : undefined} className="mt-4 space-y-4">
            <Field label="Название группы *" htmlFor="group-name" hint="До 60 символов, например ИС-26-1." error={errors.name}>
              <Input id="group-name" name="name" required maxLength={60} value={name}
                onChange={(event) => { setName(event.target.value); setErrors({ ...errors, name: undefined, form: undefined }); setStatus(""); }}
                aria-invalid={Boolean(errors.name)} aria-describedby={"group-name-hint" + (errors.name ? " group-name-error" : "")} />
            </Field>
            <Field label="Направление и вуз *" htmlFor="group-program" error={errors.programId}>
              <Select id="group-program" name="programId" required value={programId}
                onChange={(event) => { setProgramId(event.target.value); setErrors({ ...errors, programId: undefined, form: undefined }); setStatus(""); }}
                aria-invalid={Boolean(errors.programId)} aria-describedby={errors.programId ? "group-program-error" : undefined}>
                <option value="">Выберите направление</option>
                {catalog.programs.map((program) => <option key={program.id} value={program.id}>
                  {program.name} — {catalog.universities.find((item) => item.id === program.universityId)?.name}
                </option>)}
              </Select>
            </Field>
            <Field label="Курс *" htmlFor="group-year" hint="Целое число от 1 до 6." error={errors.year}>
              <Input id="group-year" name="year" type="number" required min={1} max={6} step={1} value={year}
                onChange={(event) => { setYear(event.target.value); setErrors({ ...errors, year: undefined, form: undefined }); setStatus(""); }}
                aria-invalid={Boolean(errors.year)} aria-describedby={"group-year-hint" + (errors.year ? " group-year-error" : "")} />
            </Field>
            {errors.form && <p id="group-form-error" role="alert" className="text-sm font-semibold">{errors.form}</p>}
            <div className="flex flex-wrap gap-4">
              <Button type="submit">{editingId ? "Применить в демокаталоге" : "Добавить в демокаталог"}</Button>
              <Button variant="secondary" onClick={() => { clearForm(); setStatus(""); }}>{editingId ? "Отменить редактирование" : "Очистить форму"}</Button>
            </div>
          </form>
          <p role="status" className="mt-4 text-sm">{status}</p>
        </Card>
      ))}
    </div>
  );
}
