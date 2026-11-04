"use client";

import Link from "next/link";
import { Badge, Card, PageHeader, buttonStyles } from "@/components/ui";
import { demoRoleLabels, useDemoSession } from "@/lib/demo-session";
import { siteRoutes } from "@/lib/site-routes";
import { useDemoCatalog } from "./integration-adapter";
import { SessionState } from "./session-state";

export function ProfileOverview() {
  const session = useDemoSession();
  const catalog = useDemoCatalog();
  if (!session?.profile) return <SessionState session={session} />;

  const { firstName, lastName, universityId, groupId } = session.profile;
  const university = catalog.universities.find((item) => item.id === universityId);
  const group = catalog.groups.find((item) => item.id === groupId);
  const semester = catalog.subjects.filter((subject) => subject.groupId === groupId).reduce((latest, subject) => Math.max(latest, subject.semester), 1);
  const details = [
    { label: "Имя", value: firstName },
    { label: "Фамилия", value: lastName },
    { label: "Университет", value: university?.name },
    { label: "Направление", value: group?.program },
    { label: "Группа", value: group?.name },
    { label: "Семестр", value: semester },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader eyebrow="Аккаунт" title="Личный кабинет" description="Личные и учебные данные текущего демосеанса."
        action={<Badge variant="outline">{demoRoleLabels[session.role]}</Badge>} />
      <Card>
        <h2 className="text-lg font-semibold">Мой профиль</h2>
        <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {details.map(({ label, value }) => <div key={label} className="min-w-0 border-t border-border pt-3">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold">{value ?? "—"}</dd>
          </div>)}
        </dl>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Link href={siteRoutes.setup.path} className={buttonStyles()}>Учебный план</Link>
        <Link href={siteRoutes.history.path} className={buttonStyles("secondary")}>Архив успеваемости</Link>
      </div>
    </div>
  );
}
