"use client";

import { useState } from "react";
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select } from "@/components/ui";
import { demoGroups, demoSemesters } from "@/lib/demo-data";
import { useDemoSession } from "@/lib/demo-session";
import { historyRecords } from "./history-data";

export function AcademicHistory() {
  const session = useDemoSession();
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  if (!session) return <p role="status">{session === undefined ? "Загружаем демосеанс…" : "Для просмотра архива войдите в демосеанс."}</p>;

  const group = demoGroups.find((item) => item.id === session.profile?.groupId);
  const records = historyRecords.filter((record) => record.groupId === session.profile?.groupId);
  const years = [...new Set(records.map((record) => record.year))].sort();
  const visibleRecords = records.filter((record) => (!year || record.year === year)
    && (!semester || record.semester === Number(semester)));

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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Учебный год" htmlFor="history-year">
            <Select id="history-year" value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="">Все учебные годы</option>
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Семестр" htmlFor="history-semester">
            <Select id="history-semester" value={semester} onChange={(event) => setSemester(event.target.value)}>
              <option value="">Все семестры</option>
              {demoSemesters.map((item) => <option key={item} value={item}>{item} семестр</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p role="status" className="text-sm text-muted">Показано записей: {visibleRecords.length} из {records.length}</p>
          <Button variant="secondary" disabled={!year && !semester} onClick={() => { setYear(""); setSemester(""); }}>
            Сбросить фильтры
          </Button>
        </div>
        {visibleRecords.length === 0 ? <EmptyState title="Записей нет" description={records.length
          ? "Для выбранного года и семестра записей нет. Измените условия или сбросьте фильтры."
          : "Для группы из вашего профиля ещё нет демонстрационных архивных записей."} /> : (
          <div role="region" aria-label="Учебные записи" tabIndex={0} className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Учебные результаты по году и семестру</caption>
              <thead className="bg-surface-muted text-muted"><tr>
                {["Учебный год", "Семестр", "Код", "Предмет", "Кредиты", "Оценка"].map((label) => <th key={label} scope="col" className="px-4 py-4 font-medium">{label}</th>)}
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
