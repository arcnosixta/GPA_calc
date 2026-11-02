import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, buttonStyles } from "@/components/ui";
import { siteRoutes } from "@/lib/site-routes";

export default function NotFound() {
  return (
    <AppShell>
      <PageHeader eyebrow="404" title="Страница не найдена" description="Возможно, ссылка изменилась. Вернись на главную или открой личный кабинет." />
      <div className="flex flex-wrap gap-3">
        <Link href={siteRoutes.home.path} className={buttonStyles()}>На главную</Link>
        <Link href={siteRoutes.dashboard.path} className={buttonStyles("secondary")}>Личный кабинет</Link>
      </div>
    </AppShell>
  );
}
