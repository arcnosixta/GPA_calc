"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { readAccount, type Account } from "@/lib/data/profile";
import { dataErrorMessage } from "@/lib/data/errors";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { DatabaseCatalog } from "./database-catalog";
import { DatabaseDirectories } from "./database-directories";
import { DatabaseSemesters } from "./database-semesters";
import { DatabaseStudyPlans } from "./database-study-plans";
import { DatabaseUsers } from "./database-users";
import { DatabaseHistory } from "./database-history";

const sections = [
  ["catalog", "/management", "Предметы"],
  ["universities", "/management/universities", "Вузы"],
  ["programs", "/management/programs", "Направления"],
  ["groups", "/management/groups", "Группы"],
  ["semesters", "/management/semesters", "Семестры и календарь"],
  ["study-plans", "/management/study-plans", "Учебные планы"],
  ["history", "/management/history", "Мой архив"],
  ["users", "/management/users", "Пользователи и роли"],
] as const;
type Section = typeof sections[number][0];

function allowed(section: Section, account: Account) {
  if (section === "history") return true;
  if (section === "users") return account.role === "admin";
  return account.role === "admin" || account.role === "moderator";
}

export function DatabaseManagement({ section }: { section: Section }) {
  const [account, setAccount] = useState<Account | null>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let request = 0;
    async function load() {
      const current = ++request;
      setAccount(undefined);
      setError("");
      try {
        const result = await readAccount();
        if (active && current === request) setAccount(result);
      } catch (error) {
        if (active && current === request) setError(dataErrorMessage(error));
      }
    }
    const timer = setTimeout(() => void load(), 0);
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      subscription = createBrowserSupabaseClient().auth.onAuthStateChange((event) => {
        if (["SIGNED_OUT", "SIGNED_IN", "USER_UPDATED"].includes(event)) {
          setTimeout(() => { if (active) void load(); }, 0);
        }
      }).data.subscription;
    } catch { /* The account request displays configuration errors. */ }
    return () => { active = false; clearTimeout(timer); subscription?.unsubscribe(); };
  }, [attempt]);

  if (error) return <Card className="space-y-4"><p role="alert">{error}</p><Button onClick={() => setAttempt(attempt + 1)}>Повторить подключение</Button></Card>;
  if (account === undefined) return <p role="status">Проверяем аккаунт и права доступа…</p>;
  if (!account) return <Card className="space-y-4"><p>Для работы с базой данных войдите в аккаунт.</p><Link href="/login" className="underline">Войти</Link></Card>;

  return <div className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Badge variant="outline">База данных · {{ student: "Студент", moderator: "Модератор", admin: "Администратор" }[account.role]}</Badge>
      <Button variant="secondary" onClick={() => setAttempt(attempt + 1)}>Обновить данные и права</Button>
    </div>
    <nav aria-label="Разделы управления" className="flex flex-wrap gap-4 text-sm">
      {sections.filter(([name]) => allowed(name, account)).map(([name, href, title]) => <Link key={name} href={href}
        aria-current={section === name ? "page" : undefined}
        className={section === name ? "rounded-lg bg-primary px-4 py-3 text-primary-foreground" : "rounded-lg bg-surface-muted px-4 py-3 underline underline-offset-4"}>{title}</Link>)}
    </nav>
    {!allowed(section, account) ? <Card><p>Для вашей роли этот раздел недоступен. Свой архив можно открыть по ссылке выше.</p></Card> :
      <Content key={`${account.user.id}:${account.role}:${attempt}:${section}`} section={section} account={account} />}
  </div>;
}

function Content({ section, account }: { section: Section; account: Account }) {
  if (section === "catalog") return <DatabaseCatalog account={account} />;
  if (section === "universities" || section === "programs" || section === "groups") return <DatabaseDirectories account={account} kind={section} />;
  if (section === "semesters") return <DatabaseSemesters account={account} />;
  if (section === "study-plans") return <DatabaseStudyPlans account={account} />;
  if (section === "users") return <DatabaseUsers account={account} />;
  return <DatabaseHistory account={account} />;
}
