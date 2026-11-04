import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, PageHeader, buttonStyles } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Геймификация" };

const participants = [
  { name: "Север", points: 120 },
  { name: "Пиксель", points: 90 },
  { name: "Сова", points: 60 },
];

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Учебное сообщество"
        title="Геймификация"
        description="Учебные задания, личные достижения и рейтинг по баллам за проверенные работы. На экране показаны примеры."
        action={<Link href="/dashboard" className={buttonStyles("secondary")}>На главную</Link>}
      />

      <nav aria-label="Разделы геймификации" className="flex flex-wrap gap-2">
        <a href="#challenge" className={buttonStyles("secondary")}>Задание</a>
        <a href="#rewards" className={buttonStyles("secondary")}>Достижения</a>
        <a href="#ranking" className={buttonStyles("secondary")}>Рейтинг</a>
      </nav>

      <section id="challenge" aria-labelledby="challenge-title"
        className="scroll-mt-6 rounded-xl bg-primary p-5 text-primary-foreground sm:p-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_12rem] md:items-start">
          <div className="space-y-4">
            <Badge variant="outline">Пример задания</Badge>
            <h2 id="challenge-title" className="text-2xl font-semibold tracking-tight">Разбор учебной задачи</h2>
            <p className="max-w-xl text-sm leading-6 text-zinc-300">
              Выбери задачу по одному из предметов и подготовь короткое объяснение решения. Участие добровольное.
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-zinc-200">
              <li>Сформулируй задачу своими словами.</li>
              <li>Запиши ход решения и проверь результат.</li>
              <li>Подготовь работу к проверке.</li>
            </ol>
            <Link href="/subjects" className={buttonStyles("secondary") + " focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary"}>
              Мои предметы <Icon name="arrow" className="size-4" />
            </Link>
          </div>
          <div className="rounded-lg border border-white/20 p-4">
            <p className="text-xs font-medium text-zinc-300">Пример награды</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">+30 баллов</p>
            <p className="mt-2 text-xs leading-5 text-zinc-300">За решение, которое прошло проверку.</p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section id="rewards" aria-labelledby="rewards-title" className="min-w-0 scroll-mt-6">
          <Card className="space-y-5">
            <div>
              <h2 id="rewards-title" className="text-lg font-semibold">Достижения</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Примеры целей и прогресса по учебному плану.</p>
            </div>
            <ul className="divide-y divide-border">
              <li className="flex items-start gap-3 py-4 first:pt-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                  <Icon name="check" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">Первый план</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">Добавить предметы в учебный план.</p>
                </div>
                <Badge className="shrink-0">Получено</Badge>
              </li>
              <li className="flex items-start gap-3 py-4 last:pb-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                  <Icon name="book" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">Все оценки</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    Пример прогресса: 2 из 3 предметов с оценкой.
                  </p>
                  <progress aria-label="Пример прогресса по оценкам" value={2} max={3}
                    className="mt-3 h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-muted [&::-webkit-progress-value]:bg-primary" />
                </div>
              </li>
            </ul>
          </Card>
        </section>

        <section id="ranking" aria-labelledby="ranking-title" className="min-w-0 scroll-mt-6">
          <Card className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 id="ranking-title" className="text-lg font-semibold">Рейтинг</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Баллы за проверенные задания.</p>
              </div>
              <Badge variant="outline">Демоданные</Badge>
            </div>
            <ol aria-label="Участники по количеству баллов" className="divide-y divide-border">
              {participants.map((participant, index) => (
                <li key={participant.name} className="flex min-w-0 items-center gap-3 py-4 first:pt-0 last:pb-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-sm font-semibold tabular-nums">
                    <span className="sr-only">Место </span>{index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium">{participant.name}</span>
                  <span className="shrink-0 text-sm tabular-nums">{participant.points} баллов</span>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      </div>
    </div>
  );
}
