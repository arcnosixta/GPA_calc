"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { dataErrorMessage } from "@/lib/data/errors";
import { readCalendars } from "@/lib/data/student";
import type { Json } from "@/lib/database.types";

function range(value: Json) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "не указано";
  return `${value.kind === "weeks" ? "Недели " : ""}${value.start} — ${value.end}`;
}

export function SupabaseCalendar({ universityId, year }: { universityId: string; year: string }) {
  const [state, setState] = useState<{ data?: Awaited<ReturnType<typeof readCalendars>>; error?: string }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    readCalendars(universityId, year).then((data) => { if (active) setState({ data }); })
      .catch((error) => { if (active) setState({ error: dataErrorMessage(error) }); });
    return () => { active = false; };
  }, [universityId, year, attempt]);
  return <Card className="space-y-4">
    <h2 className="text-lg font-semibold">Учебный календарь · {year}</h2>
    {state.error ? <><p role="alert">{state.error}</p><Button onClick={() => { setState({}); setAttempt(attempt + 1); }}>Повторить</Button></> : !state.data ? <p role="status">Загружаем календарь…</p> : !state.data.calendars.length ? <p>Для вашего вуза и этого года календарь пока не опубликован.</p> : state.data.calendars.map((calendar) => {
      const source = state.data?.sources.find((item) => item.id === calendar.source_id);
      return <section key={calendar.id} className="space-y-3 border-t border-border pt-4">
        <h3 className="font-semibold">{calendar.scope}</h3>
        <p className="text-sm">{calendar.status === "official" ? "Официальный календарь" : calendar.status === "demo" ? "Демонстрационный пример из каталога" : "Локальный календарь вуза"}</p>
        {state.data?.terms.filter((term) => term.calendar_id === calendar.id).map((term) => <dl key={term.id} className="space-y-1 text-sm">
          <dt className="font-semibold">{term.season === "autumn" ? "Осень" : "Весна"}</dt><dd>Учебный период: {range(term.period)}</dd><dd>РК1: {range(term.rk1)}</dd><dd>РК2: {range(term.rk2)}</dd>
        </dl>)}
        {source && source.url.startsWith("https://") && <a className="break-words underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title} · проверено {source.checked_at}</a>}
      </section>;
    })}
  </Card>;
}
