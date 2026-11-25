import { DatabaseManagement } from "@/components/management/database-management";
import { isSupabaseMode } from "@/lib/data/mode";
import type { Metadata } from "next";
import { StudyPlansManager } from "@/components/management/study-plans-manager";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.studyPlans.title };

export default function Page() {
  if (isSupabaseMode) return <DatabaseManagement section="study-plans" />;
  return <StudyPlansManager />;
}
