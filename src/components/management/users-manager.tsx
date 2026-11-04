"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Card, EmptyState, Field, Select, buttonStyles } from "@/components/ui";
import { updateDemoUser, useDemoCatalog } from "@/lib/demo-catalog";
import { demoRoleLabels, useDemoSession } from "@/lib/demo-session";

export function UsersManager() {
  const session = useDemoSession();
  const catalog = useDemoCatalog();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"student" | "moderator">("student");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (session === undefined) return <p role="status">Восстанавливаем демосеанс…</p>;
  if (!session) return <Link href="/login" className={buttonStyles()}>Перейти ко входу</Link>;
  if (session.role !== "admin") {
    return <EmptyState title="Назначение ролей доступно администратору"
      description="В этом демосеансе можно посмотреть свой учебный архив."
      action={<Link href="/management/history" className={buttonStyles()}>Открыть архив успеваемости</Link>} />;
  }

  function selectUser(id: string) {
    const user = catalog.users.find((item) => item.id === id);
    setUserId(id);
    setRole(user?.role === "moderator" ? "moderator" : "student");
    setGroupIds(user?.groupIds ?? []);
    setError("");
    setMessage("");
  }

  function applyRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const user = catalog.users.find((item) => item.id === userId);
    if (!user || user.role === "admin") {
      setError("Выберите запись студента или модератора.");
      const field = event.currentTarget.elements.namedItem("userId");
      if (field instanceof HTMLElement) field.focus();
      return;
    }

    const result = updateDemoUser(session, userId, { role, groupIds: role === "moderator" ? groupIds : [] });
    if (!result.ok) {
      setError(result.error ?? "Не удалось изменить демозапись. Проверьте выбранные данные.");
      const field = event.currentTarget.elements.namedItem("userId");
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    setError("");
    if (role === "student") setGroupIds([]);
    setMessage(`${user.name}: роль «${demoRoleLabels[role]}» применена локально. Роль текущего демосеанса не изменилась.`);
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6">
        <p className="font-semibold">Изменяется только демозапись пользователя</p>
        <p className="mt-2 text-muted">
          Это не переключатель роли текущего сеанса и не настоящая проверка доступа на сервере.
          Для показа области модератора используется запись «Дамир Соколов».
          Назначенные ей группы определяют доступные действия в демороли модератора.
        </p>
      </div>

      <Card className="min-w-0">
        <h2 id="users-list-title" className="text-lg font-semibold">Демопользователи</h2>
        <p className="mb-4 mt-2 text-sm text-muted">Имена вымышлены. Показаны роли и назначенные группы.</p>
        <div role="region" aria-labelledby="users-list-title" tabIndex={0}
          className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="sr-only">Роли и назначенные группы демопользователей</caption>
            <thead className="bg-surface-muted text-muted">
              <tr>
                <th scope="col" className="p-4 font-medium">Пользователь</th>
                <th scope="col" className="p-4 font-medium">Роль</th>
                <th scope="col" className="p-4 font-medium">Назначенные группы</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {catalog.users.map((user) => (
                <tr key={user.id}>
                  <th scope="row" className="p-4 font-medium">{user.name}</th>
                  <td className="p-4">{demoRoleLabels[user.role]}</td>
                  <td className="p-4">
                    {user.role === "admin" ? "Весь каталог" : user.role === "student" ? "Не назначаются" :
                      user.groupIds.map((id) => catalog.groups.find((group) => group.id === id)?.name).filter(Boolean).join(", ") || "Не назначены"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 id="user-role-form-title" className="text-lg font-semibold">Назначить роль и группы</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Можно назначить роль студента или модератора. Запись администратора здесь не изменяется.
        </p>
        <form noValidate aria-labelledby="user-role-form-title" onSubmit={applyRole} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Демопользователь" htmlFor="role-user" error={error}>
              <Select id="role-user" name="userId" value={userId} required
                aria-invalid={Boolean(error)} aria-describedby={error ? "role-user-error" : undefined}
                onChange={(event) => selectUser(event.target.value)}>
                <option value="">Выберите пользователя</option>
                {catalog.users.filter((user) => user.role !== "admin").map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Назначаемая роль" htmlFor="user-role">
              <Select id="user-role" name="role" value={role} onChange={(event) => {
                setRole(event.target.value as "student" | "moderator");
                setError("");
                setMessage("");
              }}>
                <option value="student">Студент</option>
                <option value="moderator">Модератор</option>
              </Select>
            </Field>
          </div>
          <fieldset disabled={role !== "moderator"} aria-describedby="user-groups-hint"
            className="rounded-lg border border-border p-4 disabled:opacity-60">
            <legend className="px-2 text-sm font-medium">Группы модератора</legend>
            <p id="user-groups-hint" className="mb-4 text-xs leading-5 text-muted">
              Студенту группы ответственности не назначаются. Модератор без назначений не сможет менять каталог.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {catalog.groups.map((group) => (
                <label key={group.id} className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" name="groups" value={group.id} className="size-4 shrink-0 accent-black"
                    checked={role === "moderator" && groupIds.includes(group.id)} onChange={(event) => {
                      setGroupIds(event.target.checked ? [...groupIds, group.id] : groupIds.filter((id) => id !== group.id));
                      setError("");
                      setMessage("");
                    }} />
                  <span className="min-w-0 wrap-anywhere">{group.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-4">
            <Button type="submit">Применить локально</Button>
            <Button variant="secondary" onClick={() => selectUser(userId)} disabled={!userId}>Отменить изменения формы</Button>
          </div>
          <p role="status" className="text-sm leading-6">{message}</p>
        </form>
      </Card>
    </div>
  );
}
