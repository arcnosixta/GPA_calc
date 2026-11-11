"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, buttonStyles } from "@/components/ui";
import { getManagedUniversityIds, saveProgram, useDemoCatalog } from "@/lib/demo-catalog";
import { useDemoSession } from "@/lib/demo-session";

export function ProgramsManager() {
  const session = useDemoSession();
  const catalog = useDemoCatalog();
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [filter, setFilter] = useState("");
  const [errors, setErrors] = useState<{ name?: string; universityId?: string; form?: string }>({});
  const [status, setStatus] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const allowedIds = getManagedUniversityIds(session, catalog);
  const universities = catalog.universities.filter((item) => allowedIds.includes(item.id));
  const programs = catalog.programs.filter((item) => allowedIds.includes(item.universityId) && (!filter || item.universityId === filter));

  function focusName() {
    const field = formRef.current?.elements.namedItem("name");
    if (field instanceof HTMLElement) field.focus();
  }

  function clearForm() {
    setEditingId(undefined); setName(""); setUniversityId(""); setErrors({});
    focusName();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    const nextErrors: typeof errors = {};
    const previous = catalog.programs.find((item) => item.id === editingId);
    if (!name.trim() || name.trim().length > 120) nextErrors.name = "Введите название от 1 до 120 символов.";
    else if (catalog.programs.some((item) => item.id !== editingId && item.universityId === universityId && item.name.toLowerCase() === name.trim().toLowerCase())) {
      nextErrors.name = "В этом вузе уже есть направление с таким названием.";
    }
    if (!allowedIds.includes(universityId)) nextErrors.universityId = "Выберите доступный вуз.";
    else if (previous && previous.universityId !== universityId && catalog.groups.some((group) => group.programId === editingId)) {
      nextErrors.universityId = "Направление используется группами: его вуз менять нельзя.";
    }
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      const field = event.currentTarget.elements.namedItem(firstError);
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    const result = saveProgram(session, { name: name.trim(), universityId }, editingId);
    if (!result.ok) {
      setErrors({ form: result.error ?? "Не удалось изменить демокаталог." });
      event.currentTarget.focus();
      return;
    }
    setStatus((editingId ? "Направление изменено." : "Направление добавлено.") + " " +
      (filter && filter !== universityId ? "Оно скрыто текущим фильтром по вузу." : ""));
    clearForm();
  }

  if (session === undefined) return <p role="status">Загружаем демосеанс…</p>;
  if (!session || session.role === "student") return null;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Направления" eyebrow="Учебные справочники"
        description="Каждое направление связано с вузом. Изменения сохраняются в этом браузере."
        action={<Badge variant="outline">Демокаталог</Badge>} />
      <nav aria-label="Связанные учебные справочники" className="flex flex-wrap gap-4">
        <Link href="/management/universities" className={buttonStyles("secondary")}>Университеты</Link>
        <Link href="/management/groups" className={buttonStyles("secondary")}>Учебные группы</Link>
      </nav>
      <Card className="space-y-4">
        <Field label="Фильтр по вузу" htmlFor="program-university-filter">
          <Select id="program-university-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="">Все доступные вузы</option>
            {universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}
          </Select>
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p role="status" className="text-sm text-muted">Направлений: {programs.length}</p>
          <Button variant="secondary" disabled={!filter} onClick={() => setFilter("")}>Сбросить фильтр</Button>
        </div>
      </Card>
      {programs.length === 0 ? <EmptyState title="Направления не найдены"
        description="Выберите другой вуз, сбросьте фильтр или добавьте направление в доступный вуз." /> : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {programs.map((program) => <Card key={program.id} className="min-w-0 space-y-4">
            <h2 className="wrap-anywhere text-base font-semibold">{program.name}</h2>
            <p className="wrap-anywhere text-sm leading-6 text-muted">{catalog.universities.find((item) => item.id === program.universityId)?.name}</p>
            <p className="text-sm text-muted">Групп: {catalog.groups.filter((group) => group.programId === program.id).length}</p>
            <Button variant="secondary" aria-label={"Редактировать направление: " + program.name} onClick={() => {
              setEditingId(program.id); setName(program.name); setUniversityId(program.universityId); setErrors({}); setStatus(""); focusName();
            }}>Редактировать</Button>
          </Card>)}
        </div>
      )}
      {universities.length === 0 ? <p className="text-sm text-muted">Сначала добавьте вуз в разделе «Университеты».</p> : (
        <Card>
          <h2 id="program-form-title" className="text-lg font-semibold">{editingId ? "Редактирование направления" : "Новое направление"}</h2>
          <form ref={formRef} noValidate onSubmit={submit} aria-labelledby="program-form-title"
            tabIndex={-1} aria-describedby={errors.form ? "program-form-error" : undefined} className="mt-4 space-y-4">
            <Field label="Название направления *" htmlFor="program-name" hint="До 120 символов." error={errors.name}>
              <Input id="program-name" name="name" required maxLength={120} value={name}
                onChange={(event) => { setName(event.target.value); setErrors({ ...errors, name: undefined, form: undefined }); setStatus(""); }}
                aria-invalid={Boolean(errors.name)} aria-describedby={"program-name-hint" + (errors.name ? " program-name-error" : "")} />
            </Field>
            <Field label="Университет *" htmlFor="program-university" error={errors.universityId}>
              <Select id="program-university" name="universityId" required value={universityId}
                onChange={(event) => { setUniversityId(event.target.value); setErrors({ ...errors, universityId: undefined, form: undefined }); setStatus(""); }}
                aria-invalid={Boolean(errors.universityId)} aria-describedby={errors.universityId ? "program-university-error" : undefined}>
                <option value="">Выберите вуз</option>
                {universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}
              </Select>
            </Field>
            {errors.form && <p id="program-form-error" role="alert" className="text-sm font-semibold">{errors.form}</p>}
            <div className="flex flex-wrap gap-4">
              <Button type="submit">{editingId ? "Применить в демокаталоге" : "Добавить в демокаталог"}</Button>
              <Button variant="secondary" onClick={() => { clearForm(); setStatus(""); }}>{editingId ? "Отменить редактирование" : "Очистить форму"}</Button>
            </div>
          </form>
          <p role="status" className="mt-4 text-sm">{status}</p>
        </Card>
      )}
    </div>
  );
}
