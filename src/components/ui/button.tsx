import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export function buttonStyles(variant: ButtonVariant = "primary") {
  const variants = {
    primary: "border-primary bg-primary text-primary-foreground hover:bg-zinc-800",
    secondary: "border-border bg-surface text-foreground hover:bg-surface-muted",
    ghost: "border-transparent bg-transparent text-foreground hover:bg-surface-muted",
  };
  return "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 " + variants[variant];
}

export function Button({
  variant = "primary", className = "", type = "button", ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonStyles(variant) + " " + className} {...props} />;
}
