"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, buttonStyles } from "@/components/ui";
import { demoModeratorId, getManagedUniversityIds, saveUniversity, useDemoCatalog } from "@/lib/demo-catalog";
import { useDemoSession } from "@/lib/demo-session";

export function UniversitiesManager() {
  const session = useDemoSession();
  const catalog = useDemoCatalog();
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const allowedIds = getManagedUniversityIds(session, catalog);
  const universities = catalog.universities.filter((item) => allowedIds.includes(item.id));
  const canCreate = session?.role === "admin" || catalog.users.some((user) => user.id === demoModeratorId && user.role === "moderator");

  function focusName() {
    const field = formRef.current?.elements.namedItem("name");
    if (field instanceof HTMLElement) field.focus();
  }

  function clearForm() {
    setEditingId(undefined);
    setName("");
    setError("");
    focusName();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    const title = name.trim();
    if (!title || title.length > 120) {
      setError("Введите название от 1 до 120 символов, не только пробелы.");
      focusName();
      return;
    }
    const result = saveUniversity(session, { name: title }, editingId);
    if (!result.ok) {
      setError(result.error ?? "Не удалось изменить демокаталог.");
      focusName();
      return;
    }
    setStatus(editingId ? "Название вуза изменено в этой вкладке." : "Вуз добавлен в демокаталог этой вкладки.");
    clearForm();
  }

  if (session === undefined) return <p role="status">Загружаем демосеанс…</p>;
  if (!session || session.role === "student") return null;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Университеты" eyebrow="Учебные справочники"
        description="Локальный справочник вузов. Изменения доступны в текущей вкладке и не отправляются на сервер."
        action={<Badge variant="outline">Демокаталог</Badge>} />
      {session.role === "moderator" && <p className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6">
        Показаны вузы назначенных групп и созданные в демообласти модератора. Новый вуз также закрепляется за этой областью.
      </p>}
      <nav aria-label="Связанные учебные справочники" className="flex flex-wrap gap-4">
        <Link href="/management/programs" className={buttonStyles("secondary")}>Направления</Link>
        <Link href="/management" className={buttonStyles("ghost")}>Каталог предметов</Link>
      </nav>

      {universities.length === 0 ? <EmptyState title="Нет доступных вузов"
        description="Добавьте демонстрационный вуз или попросите администратора назначить группы модератору." /> : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {universities.map((university) => (
            <Card key={university.id} className="min-w-0 space-y-4">
              <h2 className="wrap-anywhere text-base font-semibold">{university.name}</h2>
              <p className="text-sm text-muted">
                Направлений: {catalog.programs.filter((item) => item.universityId === university.id).length}
                {" · "}Групп: {catalog.groups.filter((group) => group.universityId === university.id).length}
              </p>
              <Button variant="secondary" aria-label={"Редактировать вуз: " + university.name} onClick={() => {
                setEditingId(university.id); setName(university.name); setError(""); setStatus(""); focusName();
              }}>Редактировать</Button>
            </Card>
          ))}
        </div>
      )}

      {canCreate ? <Card>
        <h2 id="university-form-title" className="text-lg font-semibold">{editingId ? "Редактирование вуза" : "Новый вуз"}</h2>
        <form ref={formRef} noValidate onSubmit={submit} aria-labelledby="university-form-title" className="mt-4 space-y-4">
          <Field label="Название вуза *" htmlFor="university-name" hint="До 120 символов." error={error || undefined}>
            <Input id="university-name" name="name" required maxLength={120} value={name}
              onChange={(event) => { setName(event.target.value); setError(""); setStatus(""); }}
              aria-invalid={Boolean(error)} aria-describedby={"university-name-hint" + (error ? " university-name-error" : "")} />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Button type="submit">{editingId ? "Применить в демокаталоге" : "Добавить в демокаталог"}</Button>
            <Button variant="secondary" onClick={() => { clearForm(); setStatus(""); }}>{editingId ? "Отменить редактирование" : "Очистить форму"}</Button>
          </div>
        </form>
        <p role="status" className="mt-4 text-sm">{status}</p>
      </Card> : <p className="text-sm text-muted">Администратор должен вернуть записи демомодератора роль «Модератор», чтобы разрешить изменения.</p>}
    </div>
  );
}
