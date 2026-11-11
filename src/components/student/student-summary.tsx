import { Card } from "@/components/ui";
import type { Subject } from "@/lib/types";
import { calculateGpa, earnsCredits } from "./integration-adapter";

export function StudentSummary({ subjects, semester }: { subjects: readonly Subject[]; semester: number }) {
  const selected = subjects.filter((subject) => subject.semester === semester);
  const graded = selected.filter((subject) => subject.grade !== null);
  const credits = (items: readonly Subject[]) => items.reduce((sum, subject) => sum + subject.credits, 0);
  const stats = [
    { title: "Общий GPA", value: calculateGpa(subjects)?.toFixed(2) ?? "—", hint: "За все семестры личного плана" },
    { title: "GPA семестра", value: calculateGpa(selected)?.toFixed(2) ?? "—", hint: `${semester} семестр · по итоговым оценкам` },
    { title: "Кредиты в плане", value: credits(selected), hint: `С оценкой: ${credits(graded)} · зачтено: ${credits(graded.filter((subject) => earnsCredits(subject.grade)))}` },
    { title: "Прогресс оценок", value: `${graded.length} из ${selected.length}`, hint: "Предметов с оценкой в выбранном семестре" },
  ];
  return <section aria-label="Сводка личного плана" aria-live="polite" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {stats.map((stat) => <Card key={stat.title}>
      <h2 className="text-sm text-muted">{stat.title}</h2>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{stat.value}</p>
      <p className="mt-3 text-xs leading-5 text-muted">{stat.hint}</p>
    </Card>)}
  </section>;
}
