import Link from "next/link";
import { PageHeader, buttonStyles } from "@/components/ui";
import { siteRoutes } from "@/lib/site-routes";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-8">
      <PageHeader eyebrow="404" title="Страница не найдена" description="Возможно, ссылка изменилась. Открой главную или страницу входа." />
      <div className="flex flex-wrap gap-3">
        <Link href={siteRoutes.dashboard.path} className={buttonStyles()}>На главную</Link>
        <Link href={siteRoutes.login.path} className={buttonStyles("secondary")}>Ко входу</Link>
      </div>
    </main>
  );
}
