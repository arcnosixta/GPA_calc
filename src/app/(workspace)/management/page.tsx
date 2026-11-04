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
        description="Каталог для модератора и администратора. Здесь можно просматривать предметы и проверить форму нового предмета."
        action={<Badge variant="outline">Демонстрационный режим</Badge>}
      />
      <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6">
        <p className="font-semibold">Как будут распределены права</p>
        <p className="mt-2 text-muted">
          Модератор ведёт университеты, направления и предметы в своей области. Администратор также назначает роли. В демоверсии показан общий каталог.
        </p>
      </div>
      <SubjectCatalog />
      <SubjectForm />
    </div>
  );
}
