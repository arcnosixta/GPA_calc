import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";

export const metadata: Metadata = { title: "Личный кабинет" };

// Временная заглушка. Владелец страницы заменяет её своим интерфейсом.
export default function Page() {
  return <SectionPlaceholder title="Личный кабинет" description="Результаты семестра, кредиты и текущие предметы." />;
}
