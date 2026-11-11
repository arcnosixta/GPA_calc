import type { Metadata } from "next";
import { ProgressOverview } from "@/components/student/progress-overview";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.progress.title };

export default function Page() {
  return <ProgressOverview />;
}
