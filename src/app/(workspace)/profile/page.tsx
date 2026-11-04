import type { Metadata } from "next";
import { ProfileOverview } from "@/components/student/profile-overview";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.profile.title };

export default function Page() {
  return <ProfileOverview />;
}
