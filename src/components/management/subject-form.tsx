"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { demoGroups, demoSemesters } from "@/lib/demo-data";
import type { Subject } from "@/lib/types";

// Для предпросмотра не нужны ID и личная оценка студента.
type SubjectPreview = Pick<Subject, "code" | "title" | "credits" | "groupId" | "semester">;
type FormErrors = Partial<Record<keyof SubjectPreview, string>>;

export function SubjectForm() {
  const [preview, setPreview] = useState<SubjectPreview | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

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
    if (!Number.isInteger(subject.credits) || subject.credits < 1 || subject.credits > 30) {
      nextErrors.credits = "Введите целое число кредитов от 1 до 30.";
    }
    if (!demoGroups.some((group) => group.id === subject.groupId)) {
      nextErrors.groupId = "Выберите группу из списка.";
    }
    if (!demoSemesters.includes(subject.semester)) {
      nextErrors.semester = "Выберите семестр из списка.";
    }

    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      setPreview(null);
      const field = form.elements.namedItem(firstError);
      if (field instanceof HTMLElement) field.focus();
      return;
    }

    // Только локальный результат: запросов к серверу и изменения каталога нет.
    setPreview(subject);
  }

  const previewGroup = demoGroups.find((group) => group.id === preview?.groupId);

  return (
    <Card>
      <h2 id="subject-form-title" className="text-lg font-semibold">Новый предмет</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Заполните данные для предпросмотра. Предмет не добавится в каталог. Обязательные поля отмечены *.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <form noValidate aria-labelledby="subject-form-title" className="min-w-0 space-y-4"
          onSubmit={showPreview}
          onChange={(event) => {
            const field = event.target;
            if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
              setErrors({ ...errors, [field.name]: undefined });
            }
            setPreview(null);
          }}
          onReset={() => { setErrors({}); setPreview(null); }}>
          <Field label="Название предмета *" htmlFor="subject-title" hint="До 120 символов, как в учебном плане." error={errors.title}>
            <Input id="subject-title" name="title" required maxLength={120} placeholder="Например, Базы данных"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={"subject-title-hint" + (errors.title ? " subject-title-error" : "")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Код предмета" htmlFor="subject-code" hint="Необязательно, до 20 символов." error={errors.code}>
              <Input id="subject-code" name="code" maxLength={20} placeholder="Например, DB 201"
                aria-invalid={Boolean(errors.code)}
                aria-describedby={"subject-code-hint" + (errors.code ? " subject-code-error" : "")} />
            </Field>
            <Field label="Кредиты *" htmlFor="subject-credits" hint="Целое число от 1 до 30." error={errors.credits}>
              <Input id="subject-credits" name="credits" type="number" min={1} max={30} step={1} required
                aria-invalid={Boolean(errors.credits)}
                aria-describedby={"subject-credits-hint" + (errors.credits ? " subject-credits-error" : "")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Группа предмета *" htmlFor="subject-group" error={errors.groupId}>
              <Select id="subject-group" name="groupId" defaultValue="" required
                aria-invalid={Boolean(errors.groupId)} aria-describedby={errors.groupId ? "subject-group-error" : undefined}>
                <option value="">Выберите группу</option>
                {demoGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </Select>
            </Field>
            <Field label="Семестр предмета *" htmlFor="subject-semester" error={errors.semester}>
              <Select id="subject-semester" name="semester" defaultValue="" required
                aria-invalid={Boolean(errors.semester)} aria-describedby={errors.semester ? "subject-semester-error" : undefined}>
                <option value="">Выберите семестр</option>
                {demoSemesters.map((item) => <option key={item} value={item}>{item} семестр</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button type="submit">Показать предпросмотр</Button>
            <Button type="reset" variant="secondary">Очистить форму</Button>
          </div>
        </form>

        <div role="status" aria-live="polite" aria-atomic="true"
          className="min-w-0 self-start rounded-xl border border-dashed border-border bg-background p-4 sm:p-6">
          <h3 className="text-base font-semibold">Предпросмотр</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Данные не сохраняются и исчезнут после обновления страницы.</p>
          {preview ? (
            <div className="mt-6 space-y-4">
              <Badge variant="outline">Без сохранения</Badge>
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
