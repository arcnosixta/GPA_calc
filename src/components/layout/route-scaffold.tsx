import Link from "next/link";
import { Badge, Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { scaffoldContent, type WorkspaceScaffoldId } from "@/lib/scaffold-content";
import { phaseLabels, siteRoutes } from "@/lib/site-routes";

export function RouteScaffold({ page }: { page: WorkspaceScaffoldId }) {
  const route = siteRoutes[page];
  const content = scaffoldContent[page];
  const future = route.phase !== "mvp";

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader eyebrow="Учебное пространство" title={route.title} description={route.summary}
        action={<Badge variant="outline">{phaseLabels[route.phase]}</Badge>} />
      <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6">
        <p className="font-semibold">{future ? "Предварительный макет" : "Демонстрационный экран"}</p>
        <p className="mt-1 text-muted">{future
          ? "Доступность функции появится на соответствующем этапе. Сейчас можно посмотреть структуру раздела и переходы."
          : "Показана структура раздела на примерах. Данные аккаунта и учебные планы здесь не изменяются."}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="min-w-0 space-y-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">{content.panelTitle}</h2>
          {content.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-6 text-muted">{paragraph}</p>)}
          {"rows" in content && <dl className="divide-y divide-border">
            {content.rows.map((row) => <div key={row.label} className="py-4 first:pt-0 last:pb-0">
              <dt className="text-sm font-semibold">{row.label}</dt>
              <dd className="mt-1 text-sm leading-6 text-muted">{row.detail}</dd>
            </div>)}
          </dl>}
          {"fields" in content && <div className="grid gap-4 sm:grid-cols-2">
            {content.fields.map((field, index) => {
              const fieldId = page + "-example-" + index;
              return <div key={fieldId} className="min-w-0">
                <Field label={field.label} htmlFor={fieldId}>
                  <Input id={fieldId} type={"type" in field ? field.type : "text"} value={field.value}
                    readOnly disabled={"disabled" in field && field.disabled} />
                </Field>
              </div>;
            })}
          </div>}
          {"empty" in content && <div className="rounded-lg border border-dashed border-border p-5">
            <h3 className="text-sm font-semibold">{content.empty.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{content.empty.description}</p>
          </div>}
          {"action" in content && <div className="space-y-2">
            <Button disabled>{content.action}</Button>
            <p className="text-xs leading-5 text-muted">Действие пока недоступно в этом макете.</p>
          </div>}
        </Card>

        <Card className="min-w-0">
          <h2 className="text-base font-semibold">Связанные разделы</h2>
          <nav aria-label={"Связанные разделы: " + route.title} className="mt-4 space-y-2">
            {content.links.map((id) => <Link key={id} href={siteRoutes[id].path}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 text-sm font-medium transition-colors hover:bg-surface-muted">
              <span className="min-w-0">{siteRoutes[id].title}</span>
              <Icon name="chevron" className="size-4 shrink-0" />
            </Link>)}
          </nav>
        </Card>
      </div>
    </div>
  );
}
