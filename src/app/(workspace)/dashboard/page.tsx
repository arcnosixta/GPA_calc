import type { Metadata } from "next";
import { DashboardOverview } from "@/components/student/dashboard-overview";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.dashboard.title };

export default function Page() {
  return <DashboardOverview />;
}
