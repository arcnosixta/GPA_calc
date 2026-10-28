import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { PlanSetup } from "@/components/student/plan-setup";

export const metadata: Metadata = { title: "Выбор учебного плана" };

export default function Page() {
  return <div className="space-y-6">
    <PageHeader eyebrow="Начальная настройка" title="Выбор учебного плана" description="Посмотрите готовый план своей группы или попробуйте собрать набор предметов из каталога." />
    <PlanSetup />
  </div>;
}
