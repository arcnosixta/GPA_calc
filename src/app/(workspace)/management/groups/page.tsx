import { DatabaseManagement } from "@/components/management/database-management";
import { isSupabaseMode } from "@/lib/data/mode";
import type { Metadata } from "next";
import { GroupsManager } from "@/components/management/groups-manager";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.groups.title };

export default function Page() {
  if (isSupabaseMode) return <DatabaseManagement section="groups" />;
  return <GroupsManager />;
}
