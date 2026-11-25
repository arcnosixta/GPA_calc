import { DatabaseManagement } from "@/components/management/database-management";
import { isSupabaseMode } from "@/lib/data/mode";
import type { Metadata } from "next";
import { AcademicHistory } from "@/components/management/academic-history";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.history.title };

export default function Page() {
  if (isSupabaseMode) return <DatabaseManagement section="history" />;
  return <AcademicHistory />;
}
