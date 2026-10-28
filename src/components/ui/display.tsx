import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={"rounded-xl border border-border bg-surface p-5 sm:p-6 " + className} {...props} />;
}

export function Badge({
  variant = "default", className = "", ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "strong" | "outline" }) {
  const variants = {
    default: "border-transparent bg-surface-muted text-foreground",
    strong: "border-primary bg-primary text-primary-foreground",
    outline: "border-border bg-surface text-muted",
  };
  return <span className={"inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium " + variants[variant] + " " + className} {...props} />;
}

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow?: string; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0 self-start">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: {
  title: string; description: string; action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
