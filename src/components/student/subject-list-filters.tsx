"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Button, Field, Input, Select } from "@/components/ui";

type GradeFilter = "all" | "graded" | "ungraded";
type FilterableSubject = { title: string | null; code?: string | null; grade: string | null };

export function SubjectListFilters<T extends FilterableSubject>({ subjects, children }: {
  subjects: T[];
  children: (visible: T[]) => ReactNode;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const query = search.trim().toLowerCase();
  const visible = subjects.filter((subject) => {
    const matchesSearch = (subject.title ?? "").toLowerCase().includes(query) || (subject.code ?? "").toLowerCase().includes(query);
    const hasGrade = subject.grade !== null;
    return matchesSearch && (gradeFilter === "all" || (gradeFilter === "graded" ? hasGrade : !hasGrade));
  });

  return <div className="min-w-0 space-y-4">
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Field label="Поиск предмета" htmlFor={`${id}-search`}>
        <Input id={`${id}-search`} type="search" placeholder="Название или код" value={search}
          onChange={(event) => setSearch(event.target.value)} />
      </Field>
      <Field label="Итоговая оценка" htmlFor={`${id}-grade`}>
        <Select id={`${id}-grade`} value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value as GradeFilter)}>
          <option value="all">Все предметы</option>
          <option value="graded">С оценкой</option>
          <option value="ungraded">Без оценки</option>
        </Select>
      </Field>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" aria-live="polite" className="text-sm text-muted">Найдено предметов: {visible.length} из {subjects.length}</p>
      {(search !== "" || gradeFilter !== "all") && <Button variant="secondary" onClick={() => { setSearch(""); setGradeFilter("all"); }}>
        Сбросить фильтры
      </Button>}
    </div>
    {subjects.length > 0 && visible.length === 0 ? <p className="rounded-lg border border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
      Предметы не найдены. Измените запрос или сбросьте фильтры.
    </p> : children(visible)}
  </div>;
}
