import { redirect } from "next/navigation";
import { redirectRoutes, siteRoutes } from "@/lib/site-routes";

export default function Page() {
  redirect(siteRoutes[redirectRoutes.competitions].path);
}
