import type { Metadata } from "next";
import { SubjectsOverview } from "@/components/student/subjects-overview";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.subjects.title };

export default function Page() {
  return <SubjectsOverview />;
}
