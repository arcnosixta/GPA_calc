import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const fieldStyles = "min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted aria-invalid:border-foreground";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={fieldStyles + " " + className} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={fieldStyles + " " + className} {...props} />;
}

export function Field({ label, htmlFor, hint, error, children }: {
  label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium">{label}</label>
      {children}
      {hint && <p id={htmlFor + "-hint"} className="text-xs leading-5 text-muted">{hint}</p>}
      {error && <p id={htmlFor + "-error"} className="text-sm font-semibold" role="alert">{error}</p>}
    </div>
  );
}
