import { Card } from "@/components/ui";
import { demoStudent, demoSummary } from "@/lib/demo-data";

export function StudentSummary() {
  return <section aria-label="Сводка демоплана" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <Card>
      <h2 className="text-sm text-muted">Общий GPA</h2>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{demoSummary.overallGpa}<span className="ml-2 text-sm font-normal text-muted">/ 4.00</span></p>
      <p className="mt-3 text-xs text-muted">За весь период обучения</p>
    </Card>
    <Card>
      <h2 className="text-sm text-muted">GPA семестра</h2>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{demoSummary.semesterGpa}<span className="ml-2 text-sm font-normal text-muted">/ 4.00</span></p>
      <p className="mt-3 text-xs text-muted">{demoStudent.semester} семестр · демопример</p>
    </Card>
    <Card>
      <h2 className="text-sm text-muted">Кредиты в плане</h2>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{demoSummary.plannedCredits}</p>
      <p className="mt-3 text-xs text-muted">С оценкой: {demoSummary.gradedCredits} · зачтено: {demoSummary.earnedCredits}</p>
    </Card>
    <Card>
      <h2 className="text-sm text-muted">Прогресс оценок</h2>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{demoSummary.gradedSubjects}<span className="ml-2 text-sm font-normal text-muted">из {demoSummary.totalSubjects}</span></p>
      <p className="mt-3 text-xs text-muted">{demoSummary.gradedSubjects} из {demoSummary.totalSubjects} предметов с оценкой</p>
      <progress value={demoSummary.gradedSubjects} max={demoSummary.totalSubjects} aria-label="Предметы с оценкой"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-muted [&::-webkit-progress-value]:bg-primary" />
    </Card>
  </section>;
}
