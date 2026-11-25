import { DatabaseManagement } from "@/components/management/database-management";
import { isSupabaseMode } from "@/lib/data/mode";
import type { Metadata } from "next";
import { UniversitiesManager } from "@/components/management/universities-manager";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.universities.title };

export default function Page() {
  if (isSupabaseMode) return <DatabaseManagement section="universities" />;
  return <UniversitiesManager />;
}
