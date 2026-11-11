"use client";

import { Badge, Card, Field, Select } from "@/components/ui";
import { academicCalendars, isAcademicCalendarId, type AcademicCalendarId } from "@/lib/academic-calendar";

type AcademicCalendarProps = {
  semester: number;
  calendarId: AcademicCalendarId;
  onCalendarChange: (id: AcademicCalendarId) => void;
};

export function AcademicCalendar({ semester, calendarId, onCalendarChange }: AcademicCalendarProps) {
  const calendar = academicCalendars[calendarId];
  const year = Math.ceil(semester / 2);
  const terms = [
    { title: "Осенний семестр", number: year * 2 - 1 },
    { title: "Весенний семестр", number: year * 2 },
  ];

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Академический календарь</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Курс {year} · по два рубежных контроля в каждом семестре.</p>
      </div>
      <div className="max-w-sm">
        <Field label="Шаблон календаря" htmlFor="academic-calendar-preset" hint="Выберите правила, по которым хотите планировать учебный год.">
          <Select id="academic-calendar-preset" aria-describedby="academic-calendar-preset-hint" value={calendarId}
            onChange={(event) => {
              const id = event.target.value;
              if (isAcademicCalendarId(id)) onCalendarChange(id);
            }}>
            {Object.entries(academicCalendars).map(([id, definition]) => (
              <option key={id} value={id}>{definition.label}</option>
            ))}
          </Select>
        </Field>
      </div>
      <ul aria-label="Семестры учебного года" className="grid gap-3 sm:grid-cols-2">
        {terms.map((term) => (
          <li key={term.number} className="min-w-0 rounded-lg border border-border bg-background p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{term.title}</h3>
              <Badge variant="outline">{term.number} семестр</Badge>
              {term.number === semester && <Badge>Выбран</Badge>}
            </div>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">РК1</dt>
              <dd className="font-medium">{calendar.rk1Weeks}</dd>
              <dt className="text-muted">РК2</dt>
              <dd className="font-medium">{calendar.rk2Weeks}</dd>
            </dl>
          </li>
        ))}
      </ul>
      <p className="text-sm leading-6 text-muted">
        Экзамены проходят в отдельную сессию. Точные даты контролей и экзаменов смотрите в календаре вашего вуза.
      </p>
      {calendar.source ? (
        <p className="text-sm">
          <a href={calendar.source.url} className="underline decoration-border underline-offset-4 hover:decoration-current">
            {calendar.source.label}
          </a>
        </p>
      ) : (
        <p className="text-sm text-muted">Недели в этом шаблоне ориентировочные.</p>
      )}
    </Card>
  );
}
