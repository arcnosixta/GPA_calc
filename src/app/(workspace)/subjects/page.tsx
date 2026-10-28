import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";

export const metadata: Metadata = { title: "Мои предметы" };

// Временная заглушка. Владелец страницы заменяет её своим интерфейсом.
export default function Page() {
  return <SectionPlaceholder title="Мои предметы" description="Твой учебный план по семестрам и оценки по предметам." />;
}
