import Link from "next/link";
import { EmptyState, buttonStyles } from "@/components/ui";
import type { DemoSession } from "@/lib/demo-session";

export function SessionState({ session }: { session: DemoSession | null | undefined }) {
  if (session === undefined) return <p role="status">Загружаем демосеанс…</p>;
  return <EmptyState title={session === null ? "Войдите в демосеанс" : "Заполните профиль"}
    description={session === null ? "Учебный план доступен после входа." : "Укажите имя, вуз и группу в диалоге первого входа."}
    action={<Link href={session === null ? "/login" : "/dashboard"} className={buttonStyles()}>{session === null ? "Войти" : "Открыть главную"}</Link>} />;
}
