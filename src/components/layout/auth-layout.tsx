import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { siteRoutes } from "@/lib/site-routes";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Перейти к содержимому
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <Link href={siteRoutes.login.path} aria-label="ScholarPath — вход" className="inline-flex items-center gap-3 rounded-lg">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="cap" className="size-6" />
            </span>
            <span className="text-xl font-semibold tracking-tight">ScholarPath.</span>
          </Link>
          <nav aria-label="Навигация аккаунта" className="flex flex-wrap items-center gap-4 text-sm">
            <Link href={siteRoutes.login.path} className="rounded hover:underline">Вход</Link>
            <Link href={siteRoutes.register.path} className="rounded font-semibold hover:underline">Регистрация</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-8 sm:py-12 lg:grid-cols-2 lg:items-start lg:gap-12">
        <aside className="hidden rounded-xl bg-primary p-8 text-primary-foreground lg:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-300">Твой учебный путь</p>
          <p className="mt-8 text-4xl font-semibold leading-tight tracking-tight">Начни с аккаунта.<br />Продолжи своим планом.</p>
          <p className="mt-6 max-w-sm text-sm leading-6 text-zinc-300">Предметы, кредиты и результаты в одном пространстве, которое помогает двигаться в своём темпе.</p>
          <ul className="mt-8 space-y-4 text-sm">
            {["Личный учебный план", "Понятная сводка результатов", "Одна точка входа в ScholarPath"].map((item) => (
              <li key={item} className="flex items-start gap-3"><Icon name="check" className="shrink-0" />{item}</li>
            ))}
          </ul>
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 outline-none">
          <div className="mb-6">
            <Badge variant="outline">Демонстрационный экран</Badge>
            <p className="mt-3 text-xs leading-5 text-muted">Демопрофиль и учебные данные сохраняются в этом браузере.</p>
          </div>
          {children}
        </main>
      </div>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs leading-5 text-muted sm:px-8">
        ScholarPath · Аккаунты и отправка писем появятся на этапе подключения сервера.
      </footer>
    </div>
  );
}
