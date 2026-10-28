import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";

export const metadata: Metadata = { title: "Управление" };

// Временная заглушка. Владелец страницы заменяет её своим интерфейсом.
export default function Page() {
  return <SectionPlaceholder title="Управление" description="Группы, каталог предметов и учебные планы." />;
}
