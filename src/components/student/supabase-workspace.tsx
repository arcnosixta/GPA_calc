"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { SupabaseProfileForm } from "@/components/auth/supabase-profile-form";
import { dataErrorMessage } from "@/lib/data/errors";
import { readAccount, readProfileCatalog, type Account, type ProfileCatalog } from "@/lib/data/profile";
import { readStudyData, validateYear, type StudyData } from "@/lib/data/student";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { calculateGpa, earnsCredits } from "./integration-adapter";
import { SupabaseAssessment } from "./supabase-assessment";
import { SupabasePlanSetup } from "./supabase-plan-setup";
import { SupabaseCalendar } from "./supabase-calendar";

const links = [["/dashboard", "Главная"], ["/profile", "Профиль"], ["/setup", "Настройка плана"], ["/subjects", "Предметы"], ["/progress", "Прогресс"]] as const;
type Loaded = { account: Account; catalog: ProfileCatalog; study: StudyData };

export function SupabaseWorkspace() {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(""); setState(null);
    try {
      const account = await readAccount();
      if (request !== generation.current) return;
      if (!account) { router.replace("/login"); return; }
      const [catalog, study] = await Promise.all([readProfileCatalog(), readStudyData()]);
      if (request === generation.current) setState({ account, catalog, study });
    } catch (error) { if (request === generation.current) setError(dataErrorMessage(error)); }
    finally { if (request === generation.current) setLoading(false); }
  }, [router]);
  useEffect(() => {
    let active = true;
    const initial = setTimeout(() => { if (active) void reload(); }, 0);
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      subscription = createBrowserSupabaseClient().auth.onAuthStateChange((event) => {
        // Defer SDK requests until the auth callback has released its lock.
        if (["SIGNED_OUT", "SIGNED_IN", "USER_UPDATED"].includes(event)) setTimeout(() => { if (active) void reload(); }, 0);
      }).data.subscription;
    } catch { /* reload displays missing configuration as a connection error. */ }
    const requests = generation;
    return () => { active = false; clearTimeout(initial); requests.current++; subscription?.unsubscribe(); };
  }, [reload]);

  const refreshStudy = async () => {
    const account = await readAccount();
    if (!account || account.user.id !== state?.account.user.id) { await reload(); throw new Error("Account changed"); }
    const study = await readStudyData();
    setState((current) => current && current.account.user.id === account.user.id ? { ...current, study } : current);
  };
  const today = new Date();
  const start = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  const requestedYear = search.get("year");
  const year = requestedYear && /^\d{4}-\d{4}$/.test(requestedYear) && Number(requestedYear.slice(5)) === Number(requestedYear.slice(0, 4)) + 1 ? requestedYear : `${start}-${start + 1}`;

  return <div className="min-h-screen">
    <a href="#main-content" className="sr-only focus:not-sr-only">Перейти к содержимому</a>
    <header className="border-b border-border bg-surface p-4 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4"><Link href="/dashboard" className="text-xl font-semibold">ScholarPath.</Link><Badge>Личный аккаунт</Badge><Link href="/logout" className="underline">Выйти</Link></div>
      <nav aria-label="Учебное пространство" className="mx-auto mt-4 flex max-w-5xl flex-wrap gap-2">{links.map(([path, title]) => <Link key={path} href={`${path}?year=${year}`} aria-current={pathname === path ? "page" : undefined} className={`rounded-lg px-3 py-3 text-sm ${pathname === path ? "bg-primary text-primary-foreground" : "bg-surface-muted"}`}>{title}</Link>)}</nav>
    </header>
    <main id="main-content" className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
      {loading ? <p role="status">Восстанавливаем сеанс и загружаем данные…</p> : error ? <Card className="space-y-4"><p role="alert">{error}</p><Button onClick={() => void reload()}>Повторить подключение</Button><Link href="/login" className="ml-4 underline">Войти снова</Link></Card> : state ? <>
        {!state.account.profile.first_name.trim() || !state.account.profile.last_name.trim() || !state.account.profile.group_id ? <section role="dialog" aria-modal="false" aria-labelledby="complete-profile" className="mx-auto max-w-lg">
          <h1 id="complete-profile" className="mb-4 text-2xl font-semibold">Заполните профиль</h1>
          <Card><SupabaseProfileForm account={state.account} catalog={state.catalog} onSaved={(profile) => setState({ ...state, account: { ...state.account, profile } })} /></Card>
        </section> : <>
          <PageHeader title={pathname.startsWith("/subjects/") ? "Результаты предмета" : links.find(([path]) => path === pathname)?.[1] ?? "Учебное пространство"} description={`${state.account.profile.first_name} ${state.account.profile.last_name}`} />
          {pathname !== "/profile" && <YearSelector key={year} year={year} onChange={(value) => router.replace(`${pathname}?year=${value}`)} />}
          <WorkspaceContent key={`${state.account.user.id}:${pathname}:${year}`} pathname={pathname} year={year} state={state} onSaved={refreshStudy} onProfile={(profile) => setState({ ...state, account: { ...state.account, profile } })} />
        </>}
      </> : <p role="status">Открываем страницу входа…</p>}
    </main>
    <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-muted">ScholarPath · Данные личного аккаунта</footer>
  </div>;
}

function YearSelector({ year, onChange }: { year: string; onChange: (year: string) => void }) {
  const [error, setError] = useState("");
  return <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("year"));
    try { validateYear(value); setError(""); onChange(value); } catch (error) { setError(dataErrorMessage(error)); }
  }}><Field htmlFor="academic-year" label="Учебный год"><Input id="academic-year" name="year" defaultValue={year} required pattern="[0-9]{4}-[0-9]{4}" /></Field><Button type="submit" variant="secondary">Показать</Button>{error && <p role="alert">{error}</p>}</form>;
}

function WorkspaceContent({ pathname, year, state, onSaved, onProfile }: { pathname: string; year: string; state: Loaded; onSaved: () => Promise<void>; onProfile: (profile: Account["profile"]) => void }) {
  const { account, catalog, study } = state;
  const group = catalog.groups.find((item) => item.id === account.profile.group_id);
  const universityId = catalog.programs.find((item) => item.id === group?.program_id)?.university_id;
  const rows = study.results.filter((item) => item.academic_year === year);
  const subjects = rows.map((item) => ({ credits: item.credits ?? 0, grade: item.grade }));
  const cumulative = calculateGpa(study.results.map((item) => ({ credits: item.credits ?? 0, grade: item.grade })));
  const projected = calculateGpa(rows.map((item) => ({ credits: item.credits ?? 0, grade: study.forecasts.find((forecast) => forecast.student_subject_id === item.id)?.grade ?? item.grade })));
  if (pathname === "/profile") return <div className="grid gap-6 md:grid-cols-2"><Card className="space-y-3"><h2 className="font-semibold">Ваш аккаунт</h2><p className="break-all">{account.user.email}</p><p>Роль: {{ student: "Студент", moderator: "Модератор", admin: "Администратор" }[account.role]}</p><p>{catalog.universities.find((item) => item.id === universityId)?.name} · {group?.name}</p><p className="text-sm text-muted">Изменение группы сохраняет прошлые предметы и оценки.</p></Card><Card><SupabaseProfileForm account={account} catalog={catalog} onSaved={onProfile} /></Card></div>;
  if (pathname === "/setup") return <SupabasePlanSetup data={study} year={year} groupId={account.profile.group_id!} onSaved={onSaved} />;
  if (pathname.startsWith("/subjects/")) {
    const result = study.results.find((item) => item.id === pathname.split("/").pop());
    if (!result) return <Card><p>Предмет не найден в вашем личном плане.</p><Link href="/subjects" className="underline">Вернуться к предметам</Link></Card>;
    return <><Card><h2 className="text-xl font-semibold break-words">{result.title}</h2><p>{result.academic_year} · семестр {result.semester} · {result.credits} кр.</p></Card><SupabaseAssessment result={result} forecast={study.forecasts.find((item) => item.student_subject_id === result.id)?.grade} onSaved={onSaved} /></>;
  }
  if (!["/dashboard", "/subjects", "/progress", "/progress/simulator", "/progress/goals"].includes(pathname)) return <Card><p>Этот раздел ещё не подключён к личному аккаунту.</p><Link href="/dashboard" className="underline">Вернуться на главную</Link></Card>;
  return <>
    <div className="grid gap-4 sm:grid-cols-3">{[["GPA за год", calculateGpa(subjects)?.toFixed(2) ?? "—"], ["Общий GPA", cumulative?.toFixed(2) ?? "—"], ["Освоено кредитов за год", String(subjects.filter((item) => earnsCredits(item.grade)).reduce((sum, item) => sum + item.credits, 0))]].map(([title, value]) => <Card key={title}><h2 className="text-sm text-muted">{title}</h2><p className="mt-2 text-3xl font-semibold">{value}</p></Card>)}</div>
    <Card className="space-y-3"><h2 className="text-lg font-semibold">Прогноз GPA за год: {projected?.toFixed(2) ?? "—"}</h2><p className="text-sm text-muted">Используются сохранённые предположения, а для остальных предметов — фактические оценки. Прогноз не изменяет результаты. FX и F участвуют в GPA, но не дают освоенных кредитов.</p></Card>
    {pathname.startsWith("/progress") && <Card className="space-y-3"><h2 className="text-lg font-semibold">Прогресс по семестрам</h2>{[...new Set(rows.map((item) => item.semester))].map((semester) => <p key={semester}>Семестр {semester}: GPA {calculateGpa(rows.filter((item) => item.semester === semester).map((item) => ({ credits: item.credits ?? 0, grade: item.grade })))?.toFixed(2) ?? "—"}</p>)}</Card>}
    <Card className="space-y-4"><h2 className="text-lg font-semibold">Предметы · {year}</h2>{!rows.length ? <p>План пока пуст. Добавьте первый предмет из каталога.</p> : <ul className="divide-y divide-border">{rows.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><Link className="break-words font-semibold underline underline-offset-4" href={`/subjects/${item.id}?year=${year}`}>{item.title}</Link><p className="mt-1 text-sm text-muted">Семестр {item.semester} · {item.credits} кр.</p></div><span>{item.grade ?? "Нет оценки"} · {item.final_score ?? "—"}</span></li>)}</ul>}<Link className="inline-block underline" href={`/setup?year=${year}`}>Добавить предмет</Link></Card>
    {pathname === "/dashboard" && universityId && <SupabaseCalendar key={`${universityId}:${year}`} universityId={universityId} year={year} />}
  </>;
}
