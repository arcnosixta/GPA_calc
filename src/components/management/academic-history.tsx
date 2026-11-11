"use client";

import { useState } from "react";
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select } from "@/components/ui";
import { useDemoCatalog } from "@/lib/demo-catalog";
import { demoSemesters } from "@/lib/demo-data";
import { useDemoSession } from "@/lib/demo-session";
import type { Grade } from "@/lib/types";
import { gradeOptions } from "../student/integration-adapter";
import { historyRecords, selectHistoryRecords, type HistoryQuery, type HistorySort } from "./history-data";

const sortOptions: [HistorySort, string][] = [
  ["credits-asc", "Кредиты — по возрастанию"],
  ["credits-desc", "Кредиты — по убыванию"],
  ["grade-asc", "Оценка — от низкой к высокой"],
  ["grade-desc", "Оценка — от высокой к низкой"],
];

const columns = [
  ["year", "Учебный год"], ["semester", "Семестр"], ["code", "Код"],
  ["title", "Предмет"], ["credits", "Кредиты"], ["grade", "Оценка"],
];

export function AcademicHistory() {
  const session = useDemoSession();
  const { groups } = useDemoCatalog();
  const [query, setQuery] = useState<HistoryQuery>({});
  if (!session) return <p role="status">{session === undefined ? "Загружаем демосеанс…" : "Для просмотра архива войдите в демосеанс."}</p>;

  const group = groups.find((item) => item.id === session.profile?.groupId);
  const records = historyRecords.filter((record) => record.groupId === session.profile?.groupId);
  const years = [...new Set(records.map((record) => record.year))].sort();
  const credits = [...new Set(records.map((record) => record.credits))].sort((a, b) => a - b);
  const availableGrades = new Set(records.map((record) => record.grade));
  const visibleRecords = selectHistoryRecords(records, query);
  const sortedColumn = query.sort?.split("-")[0];
  const direction = query.sort?.endsWith("-asc") ? "ascending" : "descending";
  const canReset = Object.values(query).some((value) => value !== undefined);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader eyebrow="Учебные результаты" title="Архив успеваемости"
        description={`Учебные записи демопримера${group ? " для группы " + group.name : ""}. Просмотр доступен студенту, модератору и администратору.`}
        action={<Badge variant="outline">Демонстрационные записи</Badge>} />
      <p className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
        Показан вымышленный пример личного архива для группы из вашего профиля. Зафиксированные названия, кредиты и оценки
        хранятся отдельно от каталога: изменение или архивирование предмета их не меняет.
      </p>
      <Card className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Учебный год" htmlFor="history-year">
            <Select id="history-year" value={query.year ?? ""} onChange={(event) => setQuery({ ...query, year: event.target.value || undefined })}>
              <option value="">Все учебные годы</option>
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Семестр" htmlFor="history-semester">
            <Select id="history-semester" value={query.semester ?? ""} onChange={(event) => {
              const value = event.target.value;
              setQuery({ ...query, semester: value ? Number(value) : undefined });
            }}>
              <option value="">Все семестры</option>
              {demoSemesters.map((item) => <option key={item} value={item}>{item} семестр</option>)}
            </Select>
          </Field>
          <Field label="Кредиты" htmlFor="history-credits">
            <Select id="history-credits" value={query.credits ?? ""} onChange={(event) => {
              const value = event.target.value;
              setQuery({ ...query, credits: value ? Number(value) : undefined });
            }}>
              <option value="">Любое количество</option>
              {credits.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Оценка" htmlFor="history-grade">
            <Select id="history-grade" value={query.grade === null ? "ungraded" : query.grade ?? ""} onChange={(event) => {
              const value = event.target.value as Grade | "ungraded" | "";
              setQuery({ ...query, grade: value === "ungraded" ? null : value || undefined });
            }}>
              <option value="">Все оценки</option>
              {gradeOptions.filter((grade) => availableGrades.has(grade)).map((grade) => <option key={grade} value={grade}>{grade}</option>)}
              {availableGrades.has(null) && <option value="ungraded">Без оценки</option>}
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full min-w-0 sm:max-w-xs">
            <Field label="Сортировка" htmlFor="history-sort">
              <Select id="history-sort" value={query.sort ?? ""} onChange={(event) => {
                setQuery({ ...query, sort: (event.target.value as HistorySort | "") || undefined });
              }}>
                <option value="">По умолчанию</option>
                {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <p role="status" className="text-sm text-muted">Показано записей: {visibleRecords.length} из {records.length}</p>
            <Button variant="secondary" disabled={!canReset} onClick={() => setQuery({})}>Сбросить фильтры и сортировку</Button>
          </div>
        </div>
        {visibleRecords.length === 0 ? <EmptyState title="Записей нет" description={records.length
          ? "По выбранным фильтрам записей нет. Измените условия или сбросьте фильтры."
          : "Для группы из вашего профиля ещё нет демонстрационных архивных записей."} /> : (
          <div role="region" aria-label="Учебные записи" tabIndex={0} className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Учебные записи архива успеваемости</caption>
              <thead className="bg-surface-muted text-muted"><tr>
                {columns.map(([key, label]) => (
                  <th key={key} scope="col" aria-sort={key === sortedColumn ? direction : undefined} className="px-4 py-4 font-medium">
                    {label}
                  </th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-border">{visibleRecords.map((record) => <tr key={record.id}>
                <td className="whitespace-nowrap px-4 py-4">{record.year}</td>
                <td className="px-4 py-4">{record.semester}</td>
                <td className="whitespace-nowrap px-4 py-4 text-muted">{record.code}</td>
                <th scope="row" className="px-4 py-4 font-medium">{record.title}</th>
                <td className="px-4 py-4">{record.credits}</td>
                <td className="px-4 py-4"><Badge variant={record.grade ? "default" : "outline"}>{record.grade ?? "Без оценки"}</Badge></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        <p className="text-xs leading-5 text-muted">На узком экране таблица прокручивается внутри блока. Для прокрутки с клавиатуры выделите её клавишей Tab и используйте стрелки.</p>
      </Card>
    </div>
  );
}
