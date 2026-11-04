"use client";

import { useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { getManagedGroupIds, useDemoCatalog } from "@/lib/demo-catalog";
import { useDemoSession } from "@/lib/demo-session";
import type { Subject } from "@/lib/types";

export function SubjectCatalog({ onEdit, onArchive }: { onEdit: (subject: Subject) => void; onArchive: (subject: Subject) => void }) {
  const catalog = useDemoCatalog();
  const session = useDemoSession();
  const managedIds = getManagedGroupIds(session, catalog);
  const groups = catalog.groups.filter((group) => managedIds.includes(group.id));
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [semester, setSemester] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const selectedGroup = groups.find((group) => group.id === groupId);
  const availableSubjects = (showArchived ? catalog.archivedSubjects : catalog.subjects).filter((subject) => managedIds.includes(subject.groupId));
  const query = search.trim().toLowerCase();
  // filter создаёт новый список и не меняет общий каталог.
  const subjects = availableSubjects.filter((subject) => {
    const matchesSearch = (subject.title + " " + subject.code).toLowerCase().includes(query);
    const matchesGroup = !groupId || subject.groupId === groupId;
    const matchesSemester = !semester || subject.semester === Number(semester);
    return matchesSearch && matchesGroup && matchesSemester;
  });

  function resetFilters() {
    setSearch("");
    setGroupId("");
    setSemester("");
    setShowArchived(false);
  }

  return (
    <Card className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="catalog-title" className="text-lg font-semibold">Каталог предметов</h2>
          <p className="mt-2 text-sm text-muted">{showArchived ? "Архивные предметы недоступны для новых выборов. Их прежние записи остаются в учебных планах." : "Активные предметы доступных вам групп. Кредиты каталога применяются к новым учебным записям."}</p>
        </div>
        <Badge>{showArchived ? "Архивных" : "Активных"}: {availableSubjects.length}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Поиск по названию или коду" htmlFor="catalog-search">
          <Input id="catalog-search" type="search" placeholder="Например, математика"
            value={search} onChange={(event) => setSearch(event.target.value)} />
        </Field>
        <Field label="Группа в каталоге" htmlFor="catalog-group">
          <Select id="catalog-group" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">Все группы</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </Select>
        </Field>
        <Field label="Семестр в каталоге" htmlFor="catalog-semester">
          <Select id="catalog-semester" value={semester} onChange={(event) => setSemester(event.target.value)}>
            <option value="">Все семестры</option>
            {catalog.semesters.map((item) => <option key={item.number} value={item.number}>{item.title}</option>)}
          </Select>
        </Field>
      </div>

      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="size-4 accent-black" />
        Показать архивные предметы
      </label>

      <div className="rounded-lg bg-surface-muted p-4 text-sm leading-6">
        <p className="font-semibold">{selectedGroup ? selectedGroup.name : "Все учебные планы"}</p>
        <p className="mt-1 text-muted">
          {selectedGroup
            ? `${selectedGroup.program} · ${selectedGroup.year} курс · Предметов в группе: ${selectedGroup.subjectCount}`
            : `Доступных групп: ${groups.length}. Выберите группу, чтобы посмотреть её предметы и семестры.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p role="status" className="text-sm text-muted">Показано: {subjects.length} из {availableSubjects.length}</p>
        <Button variant="secondary" onClick={resetFilters} disabled={!search && !groupId && !semester && !showArchived}>
          Сбросить фильтры
        </Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState title="Предметы не найдены" description="Измените поиск, группу или семестр. Чтобы увидеть весь каталог, сбросьте фильтры." />
      ) : (
        <div>
          <p id="catalog-scroll-hint" className="mb-4 text-xs leading-5 text-muted">
            Если таблица не помещается, прокрутите её по горизонтали. С клавиатуры: Tab до таблицы, затем стрелки.
          </p>
          <div role="region" aria-labelledby="catalog-title" aria-describedby="catalog-scroll-hint"
            tabIndex={0} className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[800px] text-left text-sm">
              <caption className="sr-only">Каталог предметов с учётом выбранных фильтров</caption>
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th scope="col" className="px-4 py-4 font-medium">Код</th>
                  <th scope="col" className="px-4 py-4 font-medium">Название</th>
                  <th scope="col" className="px-4 py-4 font-medium">Кредиты</th>
                  <th scope="col" className="px-4 py-4 font-medium">Группа</th>
                  <th scope="col" className="px-4 py-4 font-medium">Семестр</th>
                  <th scope="col" className="px-4 py-4 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-surface-muted">
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{subject.code || "—"}</td>
                    <th scope="row" className="px-4 py-4 font-medium">{subject.title}</th>
                    <td className="px-4 py-4 tabular-nums">{subject.credits}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {groups.find((group) => group.id === subject.groupId)?.name ?? "Группа не указана"}
                    </td>
                    <td className="px-4 py-4 tabular-nums">{subject.semester}</td>
                    <td className="px-4 py-4">
                      {showArchived ? <Badge variant="outline">В архиве</Badge> : <div className="flex flex-wrap gap-4">
                        <Button variant="secondary" aria-label={`Изменить: ${subject.title}`} onClick={() => onEdit(subject)}>Изменить</Button>
                        <Button variant="ghost" aria-label={`Архивировать: ${subject.title}`} onClick={() => onArchive(subject)}>Архивировать</Button>
                      </div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
