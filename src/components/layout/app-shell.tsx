"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/icon";
import { demoGroups, demoStudent } from "@/lib/demo-data";

const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Личный кабинет", icon: "grid" },
  { href: "/setup", label: "Выбор учебного плана", icon: "layers" },
  { href: "/subjects", label: "Мои предметы", icon: "book" },
  { href: "/management", label: "Управление", icon: "settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const current = navigation.find((item) => item.href === pathname);
  const group = demoGroups.find((item) => item.id === demoStudent.groupId);

  const links = navigation.map((item) => (
    <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}
      onClick={() => setMenuOpen(false)}
      className={"flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors " +
        (pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-muted hover:text-foreground")}>
      <Icon name={item.icon} className="shrink-0" />
      {item.label}
    </Link>
  ));

  const brand = (
    <Link href="/" aria-label="ScholarPath — главная" className="inline-flex items-center gap-3 rounded-lg">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Icon name="cap" className="size-6" />
      </span>
      <span className="text-xl font-semibold tracking-tight">ScholarPath<span className="text-muted">.</span></span>
    </Link>
  );

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Перейти к содержимому
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto border-r border-border bg-surface p-5 lg:flex">
        <div className="px-2 py-3">{brand}</div>
        <p className="mb-3 mt-10 px-3 text-xs font-semibold uppercase tracking-widest text-muted">Учебное пространство</p>
        <nav aria-label="Основная навигация" className="space-y-1">{links}</nav>
        <div className="mt-auto">
          <div className="mb-6 rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-semibold">Шаг за шагом.</p>
            <p className="mt-2 text-xs leading-5 text-muted">Предметы и результаты — в одном месте. Двигайся в своём темпе.</p>
          </div>
          <div className="flex items-center gap-3 border-t border-border px-2 pt-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold">{demoStudent.initials}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{demoStudent.name}</p>
              <p className="mt-1 text-xs text-muted">{group?.name} · Студент</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="border-b border-border bg-surface"
          onKeyDown={(event) => {
            if (event.key === "Escape" && menuOpen) {
              setMenuOpen(false);
              menuButton.current?.focus();
            }
          }}>
          <div className="flex min-h-20 items-center justify-between gap-3 px-4 sm:px-8 lg:px-10">
            <div className="lg:hidden">{brand}</div>
            <div className="hidden items-center gap-3 text-sm lg:flex">
              <Link href="/" className="text-muted hover:text-foreground">Моё пространство</Link>
              <Icon name="chevron" className="size-3 text-muted" />
              <span>{current?.label ?? "Главная"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted sm:block">{group?.name} · {demoStudent.semester} семестр</span>
              <span className="hidden sm:inline-flex"><Badge variant="outline">Демоверсия</Badge></span>
              <button ref={menuButton} type="button" aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
                aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}
                className="flex size-11 items-center justify-center rounded-lg border border-border lg:hidden">
                <Icon name={menuOpen ? "close" : "menu"} />
              </button>
            </div>
          </div>
          <nav id="mobile-navigation" aria-label="Мобильная навигация" hidden={!menuOpen}
            className="space-y-1 border-t border-border p-4 lg:hidden">{links}</nav>
        </header>

        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-8 sm:py-10 lg:px-10">
          {children}
        </main>
        <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-6 text-xs leading-5 text-muted sm:flex-row sm:justify-between sm:px-8 lg:px-10">
          <span>ScholarPath · Твой учебный путь</span>
          <span>Демонстрационные данные · без сохранения</span>
        </footer>
      </div>
    </div>
  );
}
