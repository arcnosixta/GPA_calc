"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { getManagedGroupIds, saveCatalogSubject, useDemoCatalog } from "@/lib/demo-catalog";
import { useDemoSession } from "@/lib/demo-session";
import type { Subject } from "@/lib/types";

// Для предпросмотра не нужны ID и личная оценка студента.
type SubjectPreview = Pick<Subject, "code" | "title" | "credits" | "groupId" | "semester">;
type FormErrors = Partial<Record<keyof SubjectPreview, string>>;

export function SubjectForm({ subject: editing, onSaved }: { subject: Subject | null; onSaved: () => void }) {
  const session = useDemoSession();
  const catalog = useDemoCatalog();
  const groupIds = getManagedGroupIds(session, catalog);
  const groups = catalog.groups.filter((group) => groupIds.includes(group.id));
  const [preview, setPreview] = useState<SubjectPreview | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (editing) (formRef.current?.elements.namedItem("title") as HTMLInputElement | null)?.focus();
  }, [editing]);

  useEffect(() => {
    if (formError) errorRef.current?.focus();
  }, [formError]);

  function showPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const subject: SubjectPreview = {
      title: String(data.get("title") ?? "").trim(),
      code: String(data.get("code") ?? "").trim(),
      credits: Number(data.get("credits")),
      groupId: String(data.get("groupId") ?? ""),
      semester: Number(data.get("semester")),
    };
    const nextErrors: FormErrors = {};

    if (!subject.title || subject.title.length > 120) {
      nextErrors.title = "Введите название от 1 до 120 символов, не только пробелы.";
    }
    if (subject.code.length > 20) {
      nextErrors.code = "Код должен содержать не больше 20 символов.";
    }
    if (subject.code && catalog.subjects.some((item) => item.id !== editing?.id && item.groupId === subject.groupId &&
      item.code.toLowerCase() === subject.code.toLowerCase())) {
      nextErrors.code = "В этой группе уже есть предмет с таким кодом.";
    }
    if (!Number.isInteger(subject.credits) || subject.credits < 1 || subject.credits > 30) {
      nextErrors.credits = "Введите целое число кредитов от 1 до 30.";
    }
    if (!groups.some((group) => group.id === subject.groupId)) {
      nextErrors.groupId = "Выберите назначенную вам группу из списка.";
    }
    const semester = catalog.semesters.find((item) => item.number === subject.semester);
    if (!semester || (!semester.active && (editing?.semester !== subject.semester || editing?.groupId !== subject.groupId))) {
      nextErrors.semester = "Выберите семестр, открытый для новых записей.";
    }

    setFormError("");
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      setPreview(null);
      const field = form.elements.namedItem(firstError);
      if (field instanceof HTMLElement) field.focus();
      return;
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.value === "apply") {
      const result = saveCatalogSubject(session, subject, editing?.id);
      if (!result.ok) { setFormError(result.error ?? "Не удалось применить изменения."); return; }
      onSaved();
    } else {
      // Предпросмотр сам по себе не изменяет каталог.
      setPreview(subject);
    }
  }

  const previewGroup = groups.find((group) => group.id === preview?.groupId);

  return (
    <Card>
      <h2 id="subject-form-title" className="text-lg font-semibold">{editing ? "Редактирование предмета" : "Новый предмет"}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Проверьте предпросмотр, затем примените изменения в каталоге. Обязательные поля отмечены *.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <form ref={formRef} noValidate aria-labelledby="subject-form-title" className="min-w-0 space-y-4"
          onSubmit={showPreview}
          onChange={(event) => {
            const field = event.target;
            if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
              setErrors({ ...errors, [field.name]: undefined });
            }
            setPreview(null);
            setFormError("");
          }}
          onReset={() => { setErrors({}); setPreview(null); setFormError(""); }}>
          <p ref={errorRef} role="alert" tabIndex={-1} className="text-sm font-semibold">{formError}</p>
          <Field label="Название предмета *" htmlFor="subject-title" hint="До 120 символов, как в учебном плане." error={errors.title}>
            <Input id="subject-title" name="title" defaultValue={editing?.title ?? ""} required maxLength={120} placeholder="Например, Базы данных"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={"subject-title-hint" + (errors.title ? " subject-title-error" : "")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Код предмета" htmlFor="subject-code" hint="Необязательно, до 20 символов." error={errors.code}>
              <Input id="subject-code" name="code" defaultValue={editing?.code ?? ""} maxLength={20} placeholder="Например, DB 201"
                aria-invalid={Boolean(errors.code)}
                aria-describedby={"subject-code-hint" + (errors.code ? " subject-code-error" : "")} />
            </Field>
            <Field label="Кредиты *" htmlFor="subject-credits" hint="Целое число от 1 до 30." error={errors.credits}>
              <Input id="subject-credits" name="credits" defaultValue={editing?.credits ?? ""} type="number" min={1} max={30} step={1} required
                aria-invalid={Boolean(errors.credits)}
                aria-describedby={"subject-credits-hint" + (errors.credits ? " subject-credits-error" : "")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Группа предмета *" htmlFor="subject-group" error={errors.groupId}>
              <Select id="subject-group" name="groupId" defaultValue={editing?.groupId ?? ""} required
                aria-invalid={Boolean(errors.groupId)} aria-describedby={errors.groupId ? "subject-group-error" : undefined}>
                <option value="">Выберите группу</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </Select>
            </Field>
            <Field label="Семестр предмета *" htmlFor="subject-semester" error={errors.semester}>
              <Select id="subject-semester" name="semester" defaultValue={editing?.semester ?? ""} required
                aria-invalid={Boolean(errors.semester)} aria-describedby={errors.semester ? "subject-semester-error" : undefined}>
                <option value="">Выберите семестр</option>
                {catalog.semesters.map((item) => <option key={item.number} value={item.number} disabled={!item.active && editing?.semester !== item.number}>
                  {item.title}{!item.active ? " · закрыт для новых записей" : ""}
                </option>)}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button type="submit" name="intent" value="preview" variant="secondary">Показать предпросмотр</Button>
            <Button type="submit" name="intent" value="apply">{editing ? "Применить в каталоге" : "Добавить в каталог"}</Button>
            <Button type="reset" variant="ghost">{editing ? "Вернуть значения" : "Очистить форму"}</Button>
          </div>
        </form>

        <div role="status" aria-live="polite" aria-atomic="true"
          className="min-w-0 self-start rounded-xl border border-dashed border-border bg-background p-4 sm:p-6">
          <h3 className="text-base font-semibold">Предпросмотр</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Это только проверка данных. Для изменения локального каталога нажмите отдельную кнопку применения.</p>
          {preview ? (
            <div className="mt-6 space-y-4">
              <Badge variant="outline">Ещё не применено</Badge>
              <p className="wrap-anywhere text-lg font-semibold">{preview.title}</p>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-muted">Код</dt><dd className="mt-1 wrap-anywhere font-medium">{preview.code || "Не указан"}</dd></div>
                <div><dt className="text-muted">Кредиты</dt><dd className="mt-1 font-medium">{preview.credits}</dd></div>
                <div><dt className="text-muted">Группа</dt><dd className="mt-1 font-medium">{previewGroup?.name}</dd></div>
                <div><dt className="text-muted">Семестр</dt><dd className="mt-1 font-medium">{preview.semester}</dd></div>
              </dl>
              <p className="text-sm leading-6 text-muted">{previewGroup?.program}</p>
            </div>
          ) : (
            <p className="mt-6 text-sm leading-6 text-muted">
              Заполните форму и нажмите «Показать предпросмотр». После изменения полей сформируйте его заново.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
