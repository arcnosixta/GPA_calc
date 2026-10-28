import { Badge } from "@/components/ui";
import type { Subject } from "@/lib/types";

export function StudyPlanList({ subjects }: { subjects: Subject[] }) {
  return <ul className="divide-y divide-border">
    {subjects.map((subject) => <li key={subject.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-muted">{subject.code} · {subject.semester} семестр</p>
        <h3 className="mt-1 break-words text-sm font-semibold">{subject.title}</h3>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-4 text-sm">
        <span className="text-muted">Кредиты: <span className="font-medium text-foreground">{subject.credits}</span></span>
        <Badge variant={subject.grade === null ? "outline" : "default"}>{subject.grade === null ? "Без оценки" : `Оценка: ${subject.grade}`}</Badge>
      </div>
    </li>)}
  </ul>;
}
