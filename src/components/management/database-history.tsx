"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { readOwnHistory, type ArchiveRecord } from "@/lib/data/admin";
import { managementErrorMessage } from "@/lib/data/catalog";
import type { Account } from "@/lib/data/profile";

type Query = { year: string; semester: string; credits: string; grade: string; search: string; sort: string };
const emptyQuery: Query = { year: "", semester: "", credits: "", grade: "", search: "", sort: "" };
const grades = ["A", "A−", "B+", "B", "B−", "C+", "C", "C−", "D+", "D", "FX", "F"];

export function DatabaseHistory({ account }: { account: Account }) {
  return <HistoryContent key={account.user.id} account={account} />;
}

function HistoryContent({ account }: { account: Account }) {
  const [records, setRecords] = useState<ArchiveRecord[] | null>(null);
  const [query, setQuery] = useState(emptyQuery);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(""); setRecords(null);
    try {
      const rows = await readOwnHistory(account.user.id);
      if (generation.current === request) setRecords(rows);
    } catch (reason) { if (generation.current === request) setError(managementErrorMessage(reason)); }
    finally { if (generation.current === request) setLoading(false); }
  }, [account.user.id]);
  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    const requests = generation;
    return () => { clearTimeout(timer); requests.current++; };
  }, [reload]);

  const rows = records ?? [];
  const years = [...new Set(rows.flatMap((row) => row.academic_year ? [row.academic_year] : []))].sort();
  const semesters = [...new Set(rows.flatMap((row) => row.semester === null ? [] : [row.semester]))].sort((a, b) => a - b);
  const credits = [...new Set(rows.flatMap((row) => row.credits === null ? [] : [row.credits]))].sort((a, b) => a - b);
  const search = query.search.trim().toLocaleLowerCase("ru");
  const visible = rows.filter((row) => (!query.year || row.academic_year === query.year)
    && (!query.semester || row.semester === Number(query.semester))
    && (!query.credits || row.credits === Number(query.credits))
    && (!query.grade || (query.grade === "ungraded" ? row.grade === null : row.grade === query.grade))
    && (!search || `${row.code ?? ""} ${row.title ?? ""}`.toLocaleLowerCase("ru").includes(search)));
  if (query.sort) visible.sort((a, b) => {
    const first = query.sort.startsWith("credits") ? a.credits : a.grade_points;
    const second = query.sort.startsWith("credits") ? b.credits : b.grade_points;
    if (first === null || second === null) return Number(first === null) - Number(second === null);
    return (first - second) * (query.sort.endsWith("asc") ? 1 : -1);
  });
  const change = (field: keyof Query, value: string) => setQuery({ ...query, [field]: value });

  return <div className="min-w-0 space-y-6">
    <PageHeader eyebrow="Учебные результаты" title="Архив успеваемости" description="Ваши учебные записи из базы данных." action={<Badge variant="outline">Личный архив</Badge>} />
    <p className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
      Показаны только ваши записи. Роль сотрудника не открывает чужие оценки. Названия и кредиты взяты из личного плана:
      изменение или архивирование предмета в каталоге их не меняет.
    </p>
    {loading ? <p role="status">Загружаем личный архив…</p> : error ? <Card className="space-y-4">
      <p role="alert">{error}</p><Button onClick={() => void reload()}>Повторить загрузку</Button>
    </Card> : <Card className="min-w-0 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Учебный год" htmlFor="db-history-year"><Select id="db-history-year" value={query.year} onChange={(event) => change("year", event.target.value)}>
          <option value="">Все учебные годы</option>{years.map((year) => <option key={year}>{year}</option>)}
        </Select></Field>
        <Field label="Семестр" htmlFor="db-history-semester"><Select id="db-history-semester" value={query.semester} onChange={(event) => change("semester", event.target.value)}>
          <option value="">Все семестры</option>{semesters.map((semester) => <option key={semester} value={semester}>{semester} семестр</option>)}
        </Select></Field>
        <Field label="Кредиты" htmlFor="db-history-credits"><Select id="db-history-credits" value={query.credits} onChange={(event) => change("credits", event.target.value)}>
          <option value="">Любое количество</option>{credits.map((credit) => <option key={credit} value={credit}>{credit}</option>)}
        </Select></Field>
        <Field label="Оценка" htmlFor="db-history-grade"><Select id="db-history-grade" value={query.grade} onChange={(event) => change("grade", event.target.value)}>
          <option value="">Все оценки</option>{grades.filter((grade) => rows.some((row) => row.grade === grade)).map((grade) => <option key={grade}>{grade}</option>)}
          {rows.some((row) => row.grade === null) && <option value="ungraded">Без оценки</option>}
        </Select></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Поиск по названию или коду" htmlFor="db-history-search"><Input id="db-history-search" type="search" value={query.search} onChange={(event) => change("search", event.target.value)} /></Field>
        <Field label="Сортировка" htmlFor="db-history-sort"><Select id="db-history-sort" value={query.sort} onChange={(event) => change("sort", event.target.value)}>
          <option value="">По году и семестру</option><option value="credits-asc">Кредиты — по возрастанию</option><option value="credits-desc">Кредиты — по убыванию</option>
          <option value="grade-asc">Оценка — от низкой к высокой</option><option value="grade-desc">Оценка — от высокой к низкой</option>
        </Select></Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p role="status" className="text-sm text-muted">Показано записей: {visible.length} из {rows.length}</p>
        <Button variant="secondary" disabled={!Object.values(query).some(Boolean)} onClick={() => setQuery(emptyQuery)}>Сбросить фильтры и сортировку</Button>
      </div>
      {!visible.length ? <EmptyState title="Записей нет" description={rows.length ? "Измените условия поиска или сбросьте фильтры." : "Добавьте предметы в свой личный план. Здесь появятся ваши учебные записи."} /> :
        <div role="region" aria-label="Личный учебный архив" tabIndex={0} className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Учебные записи вошедшего пользователя</caption>
            <thead className="bg-surface-muted text-muted"><tr>
              {["Учебный год", "Семестр", "Код", "Предмет", "Кредиты", "Оценка"].map((title) => <th key={title} scope="col" className="p-4 font-medium"
                aria-sort={(title === "Кредиты" && query.sort.startsWith("credits")) || (title === "Оценка" && query.sort.startsWith("grade")) ? (query.sort.endsWith("asc") ? "ascending" : "descending") : undefined}>{title}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border">{visible.map((row) => <tr key={row.id}>
              <td className="whitespace-nowrap p-4">{row.academic_year}</td><td className="p-4">{row.semester}</td><td className="p-4">{row.code || "Без кода"}</td>
              <th scope="row" className="max-w-sm wrap-anywhere p-4 font-medium">{row.title}</th><td className="p-4">{row.credits}</td><td className="p-4"><Badge variant={row.grade ? "default" : "outline"}>{row.grade ?? "Без оценки"}</Badge></td>
            </tr>)}</tbody>
          </table>
        </div>}
    </Card>}
  </div>;
}
