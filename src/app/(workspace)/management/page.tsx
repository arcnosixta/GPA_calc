import type { Metadata } from "next";
import Link from "next/link";
import { ManagementCatalog } from "@/components/management/management-catalog";
import { Badge, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Управление" };

export default function Page() {
  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Каталог и учебные планы"
        title="Управление"
        description="Предметы, кредиты и учебные планы. Создание, редактирование и архивирование на демонстрационных данных."
        action={<Badge variant="outline">Демонстрационный режим</Badge>}
      />
      <ManagementCatalog />
      <nav aria-label="Будущие разделы управления" className="flex flex-wrap gap-4 text-sm underline underline-offset-4">
        <Link href="/management/moderation">Макет модерации</Link>
        <Link href="/management/competitions">Макет управления соревнованиями</Link>
      </nav>
    </div>
  );
}
