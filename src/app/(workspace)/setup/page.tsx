import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";

export const metadata: Metadata = { title: "Выбор учебного плана" };

// Временная заглушка. Владелец страницы заменяет её своим интерфейсом.
export default function Page() {
  return <SectionPlaceholder title="Выбор учебного плана" description="Найди свою группу или выбери предметы из каталога." />;
}
