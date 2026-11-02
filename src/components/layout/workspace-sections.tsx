import Link from "next/link";
import { navigationSections, siteRoutes } from "@/lib/site-routes";
import { Icon } from "@/components/ui/icon";

export function WorkspaceSections({ pathname, onNavigate }: {
  pathname: string | null;
  onNavigate: () => void;
}) {
  return (
    <div className="mt-5 space-y-2 border-t border-border pt-4">
      {navigationSections.map((section) => (
        <details key={section.title} open={section.routes.some((id) => siteRoutes[id].path === pathname)}>
          <summary className="min-h-11 rounded-lg px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted hover:bg-surface-muted">
            {section.title}
          </summary>
          <div className="space-y-1 pb-2">
            {section.routes.map((id) => {
              const route = siteRoutes[id];
              const active = route.path === pathname;
              return (
                <Link key={id} href={route.path} aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={"flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors " +
                    (active ? "bg-primary font-medium text-primary-foreground" : "text-muted hover:bg-surface-muted hover:text-foreground")}>
                  <span>{route.title}</span>
                  {route.phase !== "mvp" && <span className={"shrink-0 text-xs " + (active ? "text-zinc-300" : "text-muted")}>Позже</span>}
                  {active && <Icon name="chevron" className="size-3 shrink-0" />}
                </Link>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
