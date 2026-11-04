import type { Metadata } from "next";
import { UsersManager } from "@/components/management/users-manager";
import { Badge, PageHeader } from "@/components/ui";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.users.title };

export default function Page() {
  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title={siteRoutes.users.title} eyebrow="Управление"
        description="Назначение ролей и групп вымышленным пользователям в локальном демосценарии."
        action={<Badge variant="outline">Демонстрационный режим</Badge>} />
      <UsersManager />
    </div>
  );
}
