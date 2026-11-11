"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { OnboardingDialog } from "@/components/auth/onboarding-dialog";
import { PageHeader, buttonStyles } from "@/components/ui";
import { useDemoSession } from "@/lib/demo-session";
import { canOpenWorkspaceRoute, siteRoutes } from "@/lib/site-routes";
import { AppShell } from "./app-shell";

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const session = useDemoSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (session === null) router.replace(siteRoutes.login.path);
  }, [router, session]);

  if (!session) return (
    <main className="mx-auto max-w-lg p-6">
      <p role="status" className="mb-4 text-sm text-muted">{session === null ? "Открываем страницу входа…" : "Загружаем демосеанс…"}</p>
      <Link className={buttonStyles("secondary")} href={siteRoutes.login.path}>Перейти ко входу</Link>
    </main>
  );

  const allowed = canOpenWorkspaceRoute(pathname, session.role);
  return (
    <AppShell session={session}>
      {!session.profile ? (
        <>
          <PageHeader title="Учебное пространство" />
          <OnboardingDialog key={session.email} email={session.email} />
        </>
      ) : !allowed ? (
        <>
          <PageHeader title="Раздел недоступен для этой роли" description="В демосеансе показаны действия, доступные выбранной роли." />
          <Link href={siteRoutes.history.path} className={buttonStyles()}>Открыть архив успеваемости</Link>
        </>
      ) : children}
    </AppShell>
  );
}
