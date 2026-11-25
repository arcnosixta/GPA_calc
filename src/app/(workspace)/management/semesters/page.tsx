import { DatabaseManagement } from "@/components/management/database-management";
import { isSupabaseMode } from "@/lib/data/mode";
import type { Metadata } from "next";
import { SemestersManager } from "@/components/management/semesters-manager";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.semesters.title };

export default function Page() {
  if (isSupabaseMode) return <DatabaseManagement section="semesters" />;
  return <SemestersManager />;
}
