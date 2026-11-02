import type { Metadata } from "next";
import { AuthScaffold } from "@/components/auth/auth-scaffold";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.resetPassword.title };

export default function Page() {
  return <AuthScaffold page="resetPassword" />;
}
