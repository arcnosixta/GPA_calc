import type { Metadata } from "next";
import { StudyPlansManager } from "@/components/management/study-plans-manager";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.studyPlans.title };

export default function Page() {
  return <StudyPlansManager />;
}
