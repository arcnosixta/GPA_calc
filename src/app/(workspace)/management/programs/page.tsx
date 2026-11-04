import type { Metadata } from "next";
import { ProgramsManager } from "@/components/management/programs-manager";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.programs.title };

export default function Page() {
  return <ProgramsManager />;
}
