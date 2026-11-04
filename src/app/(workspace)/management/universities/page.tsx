import type { Metadata } from "next";
import { UniversitiesManager } from "@/components/management/universities-manager";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.universities.title };

export default function Page() {
  return <UniversitiesManager />;
}
