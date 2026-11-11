import { useState } from "react";
import { Card } from "@/components/ui";
import { GpaHistoryPlot, gpaSeries, gpaTicks, maxGpa, plotInset } from "./gpa-history-plot";
import type { GpaHistoryPoint } from "./integration-adapter";

const displayGpa = (value: number | null) => value?.toFixed(2) ?? "—";

export function GpaHistoryChart({ history, selectedSemester, onSelectSemester }: {
  history: readonly GpaHistoryPoint[];
  selectedSemester: number;
  onSelectSemester: (semester: number) => void;
}) {
  const [hoveredSemester, setHoveredSemester] = useState<number | null>(null);
  const [focusedSemester, setFocusedSemester] = useState<number | null>(null);
  const activeSemester = hoveredSemester ?? focusedSemester ?? selectedSemester;
  const active = history.find(({ semester }) => semester === activeSemester)
    ?? history.find(({ semester }) => semester === selectedSemester)
    ?? history.at(-1);
  const hasGrades = history.some(({ semesterGpa }) => semesterGpa !== null);

  return (
    <section aria-labelledby="gpa-history-title">
      <Card className="min-w-0">
        <h2 id="gpa-history-title" className="text-lg font-semibold">Динамика GPA</h2>
        {hasGrades && active ? <>
          <p className="mt-1.5 text-sm leading-6 text-muted">Накопительный GPA учитывает оценки этого и предыдущих семестров.</p>
          <div className="mt-4 rounded-xl border border-border bg-surface-muted/55 px-3 py-3 sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
              <p className="text-sm font-semibold">{active.semester} семестр</p>
              <dl aria-label="Значения GPA" className="flex flex-wrap gap-x-5 gap-y-2">
                {gpaSeries.map((series) => (
                  <div key={series.key} className="flex items-center gap-2 text-xs">
                    <dt className="flex items-center gap-1.5 text-muted">
                      <span aria-hidden="true" className="w-4 border-t-2" style={{
                        borderColor: series.color,
                        borderStyle: series.dashed ? "dashed" : "solid",
                      }} />
                      {series.label}
                    </dt>
                    <dd className="font-semibold tabular-nums" style={{ color: series.color }}>{displayGpa(active[series.key])}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="mt-4 overflow-x-auto">
              <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2" style={{ minWidth: history.length * 44 + 28 }}>
                <div aria-hidden="true" className="relative h-44 text-right text-xs text-muted tabular-nums sm:h-52">
                  <div className="absolute inset-x-0" style={{ top: plotInset, bottom: plotInset }}>
                    {gpaTicks.map((tick) => (
                      <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: (1 - tick / maxGpa) * 100 + "%" }}>
                        {tick}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="relative min-w-0">
                  <div className="relative h-44 sm:h-52">
                    <GpaHistoryPlot history={history} activeSemester={active.semester} />
                  </div>
                  <div aria-hidden="true" className="h-10" />
                  <ol aria-label="Семестры" className="absolute inset-0 grid"
                    style={{ gridTemplateColumns: "repeat(" + history.length + ", minmax(0, 1fr))" }}
                    onPointerLeave={() => setHoveredSemester(null)}>
                    {history.map((point) => {
                      const isSelected = point.semester === selectedSemester;
                      const values = gpaSeries.map((series) => series.label + " " + (point[series.key]?.toFixed(2) ?? "нет оценок"));
                      return (
                        <li key={point.semester} className="min-w-0">
                          <button type="button" aria-pressed={isSelected} aria-label={[point.semester + " семестр", ...values].join(", ")}
                            className="group flex h-full w-full items-end justify-center rounded-md pb-1 focus-visible:-outline-offset-2"
                            onPointerEnter={(event) => { if (event.pointerType === "mouse") setHoveredSemester(point.semester); }}
                            onFocus={() => {
                              setHoveredSemester(null);
                              setFocusedSemester(point.semester);
                            }}
                            onBlur={() => setFocusedSemester(null)}
                            onClick={() => onSelectSemester(point.semester)}>
                            <span className={"min-w-7 rounded-md px-1.5 py-1 text-xs font-semibold tabular-nums " +
                              (isSelected ? "bg-primary text-primary-foreground" : "text-muted group-hover:bg-surface group-hover:text-foreground")}>
                              {point.semester}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            </div>
            <p aria-hidden="true" className="text-center text-xs text-muted">Семестр</p>
          </div>
        </> : <p className="mt-3 rounded-xl border border-dashed border-border bg-surface-muted/55 p-4 text-sm text-muted">
          График появится, когда в учебном плане будут оценки.
        </p>}
      </Card>
    </section>
  );
}
