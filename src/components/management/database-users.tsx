"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select, buttonStyles } from "@/components/ui";
import { addModeratorGroup, readAdminData, removeModeratorGroup, setUserRole, type AdminData } from "@/lib/data/admin";
import { managementErrorMessage } from "@/lib/data/catalog";
import type { Account } from "@/lib/data/profile";

const roleNames = { student: "Студент", moderator: "Модератор", admin: "Администратор" };
const profileName = (profile: AdminData["profiles"][number]) => `${profile.first_name} ${profile.last_name}`.trim() || "Профиль без имени";

export function DatabaseUsers({ account }: { account: Account }) {
  if (account.role !== "admin") return <EmptyState title="Назначение ролей доступно администратору" description="Можно посмотреть свой личный учебный архив."
    action={<Link href="/management/history" className={buttonStyles()}>Открыть архив</Link>} />;
  return <UsersContent key={account.user.id} account={account} />;
}

function UsersContent({ account }: { account: Account }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setBusy(true); setError(""); setMessage(""); setData(null);
    try {
      const loaded = await readAdminData();
      if (generation.current === request) setData(loaded);
    } catch (reason) { if (generation.current === request) { setData(null); setError(managementErrorMessage(reason)); } }
    finally { if (generation.current === request) setBusy(false); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    const requests = generation;
    return () => { clearTimeout(timer); requests.current++; };
  }, [reload]);

  async function perform(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    const request = ++generation.current;
    setBusy(true); setError(""); setMessage("");
    try {
      await action();
      const saved = await readAdminData();
      if (generation.current === request) { setData(saved); setMessage(success); }
    } catch (reason) { if (generation.current === request) { setData(null); setError(managementErrorMessage(reason)); } }
    finally { if (generation.current === request) setBusy(false); }
  }

  const eligible = data?.profiles.filter((profile) => profile.id !== account.user.id
    && data.roles.some((role) => role.user_id === profile.id && role.role !== "admin")) ?? [];
  const selected = eligible.find((profile) => profile.id === selectedId);
  const selectedRole = data?.roles.find((role) => role.user_id === selected?.id)?.role;

  return <div className="min-w-0 space-y-6">
    <PageHeader title="Пользователи и роли" eyebrow="Управление доступом" description="Роли и назначения групп из базы данных." action={<Badge variant="outline">Администратор</Badge>} />
    <p className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
      Роль аккаунта проверяет сервер. Здесь можно назначить другого пользователя студентом или модератором.
      Группы назначаются отдельно. Личные оценки других пользователей не отображаются.
    </p>
    {error && <Card className="space-y-4"><p id="db-users-error" role="alert">{error}</p><Button variant="secondary" disabled={busy} onClick={() => void reload()}>Обновить список</Button></Card>}
    {busy && <p role="status">{data ? "Проверяем и сохраняем изменение…" : "Загружаем пользователей…"}</p>}
    {data && <>
      <Card className="min-w-0 space-y-4">
        <h2 id="db-users-list-title" className="text-lg font-semibold">Пользователи</h2>
        {!data.profiles.length ? <EmptyState title="Пользователей нет" description="Профили создаются после регистрации в приложении." /> :
          <div role="region" aria-labelledby="db-users-list-title" tabIndex={0} className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[600px] text-left text-sm">
              <caption className="sr-only">Пользователи, роли и назначенные группы</caption>
              <thead className="bg-surface-muted text-muted"><tr><th scope="col" className="p-4 font-medium">Пользователь</th><th scope="col" className="p-4 font-medium">Роль</th><th scope="col" className="p-4 font-medium">Назначенные группы</th></tr></thead>
              <tbody className="divide-y divide-border">{data.profiles.map((profile) => {
                const role = data.roles.find((item) => item.user_id === profile.id)?.role;
                const assigned = data.assignments.filter((item) => item.moderator_id === profile.id);
                return <tr key={profile.id}>
                  <th scope="row" className="max-w-xs wrap-anywhere p-4 font-medium">{profileName(profile)}<span className="mt-1 block text-xs font-normal text-muted">{profile.id}</span></th>
                  <td className="p-4">{role ? roleNames[role] : "Роль не получена"}</td>
                  <td className="max-w-sm wrap-anywhere p-4">{role === "admin" ? "Весь каталог" : role !== "moderator" ? "Не назначаются" : assigned.map((item) => data.groups.find((group) => group.id === item.group_id)?.name ?? item.group_id).join(", ") || "Не назначены"}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>}
      </Card>
      <Card className="space-y-6">
        <h2 className="text-lg font-semibold">Изменить доступ</h2>
        <Field label="Пользователь" htmlFor="db-role-user"><Select id="db-role-user" disabled={busy} value={selected?.id ?? ""} onChange={(event) => { setSelectedId(event.target.value); setError(""); setMessage(""); }}>
          <option value="">Выберите пользователя</option>{eligible.map((profile) => <option key={profile.id} value={profile.id}>{profileName(profile)} · {profile.id.slice(0, 8)}</option>)}
        </Select></Field>
        {!eligible.length && <p className="text-sm text-muted">Нет других студентов или модераторов для изменения роли.</p>}
        {selected && selectedRole && selectedRole !== "admin" && <>
          <RoleEditor key={`${selected.id}:${selectedRole}`} currentRole={selectedRole} busy={busy} error={error}
            onSave={(role) => perform(() => setUserRole(selected.id, role), `Роль «${roleNames[role]}» подтверждена базой данных.`)} />
          {selectedRole === "moderator" && <GroupAssignments key={selected.id} data={data} moderatorId={selected.id} busy={busy} error={error}
            onAdd={(groupId) => perform(() => addModeratorGroup(selected.id, groupId), "Назначение группы подтверждено базой данных.")}
            onRemove={(groupId) => perform(() => removeModeratorGroup(selected.id, groupId), "Отмена назначения подтверждена базой данных.")} />}
        </>}
        <p role="status" className="text-sm leading-6">{message}</p>
      </Card>
    </>}
  </div>;
}

function RoleEditor({ currentRole, busy, error, onSave }: {
  currentRole: "student" | "moderator"; busy: boolean; error: string; onSave: (role: "student" | "moderator") => Promise<void>;
}) {
  const [role, setRole] = useState(currentRole);
  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void onSave(role); }}>
    <Field label="Новая роль" htmlFor="db-user-role"><Select id="db-user-role" disabled={busy} value={role}
      aria-describedby={error ? "db-users-error" : undefined} onChange={(event) => setRole(event.target.value as "student" | "moderator")}>
      <option value="student">Студент</option><option value="moderator">Модератор</option>
    </Select></Field>
    {role === "student" && currentRole === "moderator" && <p className="text-sm leading-6 text-muted">При назначении студентом все группы ответственности этого модератора будут сняты той же операцией базы данных.</p>}
    <Button type="submit" disabled={busy || role === currentRole}>Применить роль</Button>
  </form>;
}

function GroupAssignments({ data, moderatorId, busy, error, onAdd, onRemove }: {
  data: AdminData; moderatorId: string; busy: boolean; error: string;
  onAdd: (groupId: string) => Promise<void>; onRemove: (groupId: string) => Promise<void>;
}) {
  const [groupId, setGroupId] = useState("");
  const [removingId, setRemovingId] = useState("");
  const assignments = data.assignments.filter((item) => item.moderator_id === moderatorId);
  const available = data.groups.filter((group) => !assignments.some((item) => item.group_id === group.id));
  const selected = available.some((group) => group.id === groupId) ? groupId : "";
  return <section className="space-y-4 border-t border-border pt-6" aria-labelledby="db-assignments-title">
    <h3 id="db-assignments-title" className="font-semibold">Группы ответственности</h3>
    <p className="text-sm text-muted">Каждое назначение сохраняется отдельно после нажатия кнопки.</p>
    {!assignments.length ? <p className="text-sm text-muted">Модератору пока не назначены группы.</p> : <ul className="space-y-3">{assignments.map((item) => <li key={item.group_id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4">
      <span className="min-w-0 wrap-anywhere">{data.groups.find((group) => group.id === item.group_id)?.name ?? item.group_id}</span>
      {removingId === item.group_id ? <div className="flex flex-wrap items-center gap-3"><span className="text-sm">Снять назначение?</span>
        <Button disabled={busy} onClick={() => void onRemove(item.group_id)}>Подтвердить снятие</Button>
        <Button variant="secondary" disabled={busy} onClick={() => setRemovingId("")}>Отмена</Button></div> :
        <Button variant="secondary" disabled={busy} onClick={() => setRemovingId(item.group_id)}>Снять назначение</Button>}
    </li>)}</ul>}
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (selected) void onAdd(selected); }}>
      <Field label="Добавить группу" htmlFor="db-assignment-group"><Select id="db-assignment-group" value={selected} disabled={busy || !available.length} required
        aria-describedby={error ? "db-users-error" : undefined} onChange={(event) => setGroupId(event.target.value)}>
        <option value="">Выберите группу</option>{available.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
      </Select></Field>
      {!available.length && <p className="text-sm text-muted">Нет других групп для назначения.</p>}
      <Button type="submit" disabled={busy || !selected}>Назначить группу</Button>
    </form>
  </section>;
}
