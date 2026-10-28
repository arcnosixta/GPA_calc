"use client";

import { useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { demoGroups, demoSemesters, demoSubjects } from "@/lib/demo-data";

export function SubjectCatalog() {
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [semester, setSemester] = useState("");

  const selectedGroup = demoGroups.find((group) => group.id === groupId);
  const query = search.trim().toLowerCase();
  // filter создаёт новый список и не меняет общий каталог.
  const subjects = demoSubjects.filter((subject) => {
    const matchesSearch = (subject.title + " " + subject.code).toLowerCase().includes(query);
    const matchesGroup = !groupId || subject.groupId === groupId;
    const matchesSemester = !semester || subject.semester === Number(semester);
    return matchesSearch && matchesGroup && matchesSemester;
  });

  function resetFilters() {
    setSearch("");
    setGroupId("");
    setSemester("");
  }

  return (
    <Card className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="catalog-title" className="text-lg font-semibold">Каталог предметов</h2>
          <p className="mt-2 text-sm text-muted">Предметы всех демонстрационных учебных планов.</p>
        </div>
        <Badge>Всего: {demoSubjects.length}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Поиск по названию или коду" htmlFor="catalog-search">
          <Input id="catalog-search" type="search" placeholder="Например, математика"
            value={search} onChange={(event) => setSearch(event.target.value)} />
        </Field>
        <Field label="Группа в каталоге" htmlFor="catalog-group">
          <Select id="catalog-group" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">Все группы</option>
            {demoGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </Select>
        </Field>
        <Field label="Семестр в каталоге" htmlFor="catalog-semester">
          <Select id="catalog-semester" value={semester} onChange={(event) => setSemester(event.target.value)}>
            <option value="">Все семестры</option>
            {demoSemesters.map((item) => <option key={item} value={item}>{item} семестр</option>)}
          </Select>
        </Field>
      </div>

      <div className="rounded-lg bg-surface-muted p-4 text-sm leading-6">
        <p className="font-semibold">{selectedGroup ? selectedGroup.name : "Все учебные планы"}</p>
        <p className="mt-1 text-muted">
          {selectedGroup
            ? `${selectedGroup.program} · ${selectedGroup.year} курс · Предметов в группе: ${selectedGroup.subjectCount}`
            : `Групп в каталоге: ${demoGroups.length}. Выберите группу, чтобы посмотреть её предметы и семестры.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p role="status" className="text-sm text-muted">Показано: {subjects.length} из {demoSubjects.length}</p>
        <Button variant="secondary" onClick={resetFilters} disabled={!search && !groupId && !semester}>
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
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Каталог предметов с учётом выбранных фильтров</caption>
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th scope="col" className="px-4 py-4 font-medium">Код</th>
                  <th scope="col" className="px-4 py-4 font-medium">Название</th>
                  <th scope="col" className="px-4 py-4 font-medium">Кредиты</th>
                  <th scope="col" className="px-4 py-4 font-medium">Группа</th>
                  <th scope="col" className="px-4 py-4 font-medium">Семестр</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-surface-muted">
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{subject.code}</td>
                    <th scope="row" className="px-4 py-4 font-medium">{subject.title}</th>
                    <td className="px-4 py-4 tabular-nums">{subject.credits}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {demoGroups.find((group) => group.id === subject.groupId)?.name ?? "Группа не указана"}
                    </td>
                    <td className="px-4 py-4 tabular-nums">{subject.semester}</td>
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
