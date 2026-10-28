import type { Metadata } from "next";
import { SubjectCatalog } from "@/components/management/subject-catalog";
import { SubjectForm } from "@/components/management/subject-form";
import { Badge, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Управление" };

export default function Page() {
  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Каталог и учебные планы"
        title="Управление"
        description="Демонстрационный интерфейс для будущего администратора или модератора. Просматривайте каталог и проверяйте данные нового предмета без сохранения."
        action={<Badge variant="outline">Демонстрационный режим</Badge>}
      />
      <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6">
        <p className="font-semibold">Как будут распределены права</p>
        <p className="mt-2 text-muted">
          Модератор работает с предметами назначенных групп. Администратор также создаёт группы и назначает роли.
          Сейчас показан общий каталог: вход и проверка доступа ещё не подключены.
        </p>
      </div>
      <SubjectCatalog />
      <SubjectForm />
    </div>
  );
}
