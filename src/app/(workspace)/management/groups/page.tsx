import type { Metadata } from "next";
import { GroupsManager } from "@/components/management/groups-manager";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.groups.title };

export default function Page() {
  return <GroupsManager />;
}
