import type { Metadata } from "next";
import { RouteScaffold } from "@/components/layout/route-scaffold";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.moderation.title };

export default function Page() {
  return <RouteScaffold page="moderation" />;
}
