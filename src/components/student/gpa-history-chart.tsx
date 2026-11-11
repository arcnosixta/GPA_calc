import { Card } from "@/components/ui";
import { gradePoints, type GpaHistoryPoint } from "./integration-adapter";

const maxGpa = gradePoints.A;
const ticks = [0, 1, 2, 3, maxGpa];
const chartColumns = "grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-x-3 px-2";
const semesterSeries = { label: "GPA семестра", style: "bg-primary" };
const cumulativeSeries = { label: "Накопительный GPA", style: "border border-muted bg-surface" };

function GpaBar({ value, series }: {
  value: number | null;
  series: typeof semesterSeries;
}) {
  return <>
    <div aria-hidden="true" className="relative h-3 overflow-hidden rounded-sm bg-border/65">
      <div className="absolute inset-0 grid grid-cols-4 divide-x divide-surface">
        {ticks.slice(1).map((tick) => <span key={tick} />)}
      </div>
      {value !== null && value > 0 && (
        <div className={"relative h-full rounded-sm " + series.style} style={{ width: (value / maxGpa) * 100 + "%" }} />
      )}
    </div>
    <span className="text-right text-xs font-medium tabular-nums">
      <span className="sr-only">{series.label}: </span>
      {value === null ? <>
        <span aria-hidden="true">—</span>
        <span className="sr-only">Нет оценок</span>
      </> : value.toFixed(2)}
    </span>
  </>;
}

export function GpaHistoryChart({ history, selectedSemester }: {
  history: readonly GpaHistoryPoint[];
  selectedSemester: number;
}) {
  const hasGrades = history.some(({ semesterGpa }) => semesterGpa !== null);
  return (
    <section aria-labelledby="gpa-history-title">
      <Card className="min-w-0">
        <h2 id="gpa-history-title" className="text-lg font-semibold">Динамика GPA</h2>
        {hasGrades ? <>
          <p className="mt-2 text-sm leading-6 text-muted">Накопительный GPA учитывает оценки этого и предыдущих семестров.</p>
          <ul aria-label="Легенда" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            {[semesterSeries, cumulativeSeries].map((series) => (
              <li key={series.label} className="flex items-center gap-2">
                <span aria-hidden="true" className={"size-3 rounded-sm " + series.style} />
                {series.label}
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className={chartColumns + " mt-4 text-xs tabular-nums text-muted"}>
            <div className="col-start-2 flex justify-between">
              {ticks.map((tick) => <span key={tick}>{tick}</span>)}
            </div>
          </div>
          <ol aria-label="GPA по семестрам" className="mt-1 space-y-1">
            {history.map(({ semester, semesterGpa, cumulativeGpa }) => (
              <li key={semester} aria-current={semester === selectedSemester ? "true" : undefined}
                className={chartColumns + " gap-y-2 rounded-lg py-2.5 aria-[current=true]:bg-surface-muted aria-[current=true]:ring-1 aria-[current=true]:ring-inset aria-[current=true]:ring-border"}>
                <span className="row-span-2 text-xs font-medium">{semester} семестр</span>
                <GpaBar value={semesterGpa} series={semesterSeries} />
                <GpaBar value={cumulativeGpa} series={cumulativeSeries} />
              </li>
            ))}
          </ol>
        </> : <p className="mt-2 text-sm leading-6 text-muted">График появится, когда в учебном плане будут оценки.</p>}
      </Card>
    </section>
  );
}
