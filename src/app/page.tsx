import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, Card, PageHeader, buttonStyles } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/icon";
import { demoGroups, demoStudent, demoStudyPlan, demoSummary } from "@/lib/demo-data";

const sections: { href: string; label: string; description: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Личный кабинет", description: "Общий результат и прогресс семестра", icon: "grid" },
  { href: "/subjects", label: "Мои предметы", description: "Кредиты, семестры и оценки", icon: "book" },
  { href: "/management", label: "Управление", description: "Каталог предметов и учебные группы", icon: "settings" },
];

export default function Home() {
  const group = demoGroups.find((item) => item.id === demoStudent.groupId);

  return (
    <AppShell>
      <PageHeader eyebrow="Добро пожаловать в ScholarPath" title="Твой учебный путь."
        description="Собери предметы в один план и следи за своими результатами."
        action={<Badge variant="outline">2026 / 2027</Badge>} />

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="flex flex-col justify-between rounded-xl bg-primary p-6 text-primary-foreground sm:p-8 xl:col-span-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-300">{group?.name} · {demoStudent.semester} семестр</p>
            <h2 className="mt-8 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Новый семестр.<br />Чёткий план.</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-300">Выбери свою группу или добавь предметы из каталога. Всё важное для учёбы будет под рукой.</p>
          </div>
          <Link href="/setup" className={buttonStyles("secondary") + " mt-8 self-start"}>
            Собрать учебный план <Icon name="arrow" className="size-4" />
          </Link>
        </section>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Текущий результат</h2>
            <Badge>Пример</Badge>
          </div>
          <div className="py-8">
            <p className="text-sm text-muted">GPA семестра</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-6xl font-semibold tracking-tighter tabular-nums">{demoSummary.semesterGpa}</span>
              <span className="text-sm text-muted">/ 4.00</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-5">
            <div><p className="text-xl font-semibold tabular-nums">{demoSummary.gradedSubjects} / {demoSummary.totalSubjects}</p><p className="mt-1 text-xs text-muted">предметов с оценкой</p></div>
            <div><p className="text-xl font-semibold tabular-nums">{demoSummary.earnedCredits} / {demoSummary.plannedCredits}</p><p className="mt-1 text-xs text-muted">кредитов зачтено</p></div>
          </div>
        </Card>
      </div>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Твоё пространство</h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            {sections.map((section) => (
              <Link key={section.href} href={section.href} className="group flex items-center gap-4 rounded-xl p-4 transition-colors hover:bg-surface-muted sm:p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background"><Icon name={section.icon} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{section.label}</span><span className="mt-1 block text-xs leading-5 text-muted">{section.description}</span></span>
                <Icon name="chevron" className="size-4 shrink-0 text-muted group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Предметы семестра</h2>
            <Link href="/subjects" className="rounded text-xs font-semibold underline underline-offset-4">Все предметы</Link>
          </div>
          <div className="divide-y divide-border rounded-xl border border-border bg-surface px-5">
            {demoStudyPlan.map((subject) => (
              <div key={subject.id} className="flex min-h-20 items-center justify-between gap-3 py-4">
                <div className="min-w-0"><p className="text-sm font-medium">{subject.title}</p><p className="mt-1 text-xs text-muted">{subject.code} · Кредиты: {subject.credits}</p></div>
                <Badge variant={subject.grade ? "strong" : "outline"} className="shrink-0">{subject.grade ?? "Без оценки"}</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
