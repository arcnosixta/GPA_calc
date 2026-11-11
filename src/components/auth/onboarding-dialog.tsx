"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Field, Input, Select, buttonStyles } from "@/components/ui";
import { useDemoCatalog } from "@/lib/demo-catalog";
import { saveDemoProfile } from "@/lib/demo-session";
import { siteRoutes } from "@/lib/site-routes";

export function OnboardingDialog({ email }: { email: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [universityId, setUniversityId] = useState("");
  const [groupId, setGroupId] = useState("");
  const catalog = useDemoCatalog();
  const groups = catalog.groups.filter((group) => group.universityId === universityId);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const givenName = String(fields.get("firstName") ?? "").trim();
    const familyName = String(fields.get("lastName") ?? "").trim();
    if (!givenName || !familyName || !groups.some((group) => group.id === groupId)) return;
    if (!saveDemoProfile(email, { firstName: givenName, lastName: familyName, universityId, groupId })) return;
    if (pathname !== siteRoutes.dashboard.path) router.replace(siteRoutes.dashboard.path);
  }

  return (
    <dialog ref={dialog} aria-labelledby="onboarding-title" aria-describedby="onboarding-description"
      onCancel={(event) => event.preventDefault()}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5 text-foreground shadow-xl backdrop:bg-black/55 sm:p-7">
      <h2 id="onboarding-title" className="text-2xl font-semibold tracking-tight">Настройка профиля</h2>
      <p id="onboarding-description" className="mt-2 text-sm leading-6 text-muted">
        Укажи имя, фамилию, университет и группу. Для демоверсии можно использовать вымышленные данные.
      </p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя" htmlFor="onboarding-first-name">
            <Input id="onboarding-first-name" name="firstName" autoComplete="off" required maxLength={60} pattern={String.raw`.*\S.*`} />
          </Field>
          <Field label="Фамилия" htmlFor="onboarding-last-name">
            <Input id="onboarding-last-name" name="lastName" autoComplete="off" required maxLength={60} pattern={String.raw`.*\S.*`} />
          </Field>
        </div>
        <Field label="Университет" htmlFor="onboarding-university">
          <Select id="onboarding-university" required value={universityId} onChange={(event) => {
            setUniversityId(event.target.value);
            setGroupId("");
          }}>
            <option value="" disabled>Выбрать университет</option>
            {catalog.universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}
          </Select>
        </Field>
        <Field label="Группа" htmlFor="onboarding-group">
          <Select id="onboarding-group" required disabled={!universityId} value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="" disabled>{universityId ? "Выбрать группу" : "Сначала выбери университет"}</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </Select>
        </Field>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit">Перейти на главную</Button>
          <Link href={siteRoutes.logout.path} className={buttonStyles("ghost")}>Выйти</Link>
        </div>
      </form>
    </dialog>
  );
}
