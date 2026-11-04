import Link from "next/link";
import type { DemoRole } from "@/lib/demo-session";
import { canOpenWorkspaceRoute, catalogRoutes, siteRoutes } from "@/lib/site-routes";

const linkStyles = "flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground";

export function WorkspaceSections({ role, pathname, onNavigate }: {
  role: DemoRole;
  pathname: string;
  onNavigate: () => void;
}) {
  const routes = catalogRoutes.filter((id) => canOpenWorkspaceRoute(siteRoutes[id].path, role));

  return (
    <div className="mt-4 space-y-1 border-t border-border pt-3">
      {role !== "student" && (
        <details key={pathname} open={routes.some((id) => siteRoutes[id].path === pathname)}>
          <summary className="min-h-11 cursor-pointer rounded-lg px-3 py-3 text-sm font-semibold text-muted hover:bg-surface-muted">
            Каталог и архив
          </summary>
          <div className="space-y-1 pb-2 pl-2">
            {routes.map((id) => {
              const route = siteRoutes[id];
              const active = route.path === pathname;
              return <Link key={id} href={route.path} aria-current={active ? "page" : undefined} onClick={onNavigate}
                className={active ? "flex min-h-11 items-center rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground" : linkStyles}>
                {route.title}
              </Link>;
            })}
          </div>
        </details>
      )}
      <Link href={siteRoutes.logout.path} onClick={onNavigate} className={linkStyles}>Выйти</Link>
    </div>
  );
}
