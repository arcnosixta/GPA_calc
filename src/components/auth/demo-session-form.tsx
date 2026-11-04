"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { demoRoleLabels, endDemoSession, startDemoSession, type DemoRole } from "@/lib/demo-session";
import { siteRoutes } from "@/lib/site-routes";

export type DemoSessionPage = "login" | "register" | "logout";

const roles = ["student", "moderator", "admin"] as const satisfies readonly DemoRole[];

const actions = {
  login: "Войти",
  register: "Зарегистрироваться",
  logout: "Выйти",
};

const descriptions = {
  login: "Выберите роль для просмотра учебного пространства.",
  register: "Регистрация откроет демонстрационный кабинет с ролью студента.",
  logout: "Завершите демо-сеанс, чтобы вернуться на экран входа.",
};

export function DemoSessionForm({ page }: { page: DemoSessionPage }) {
  const router = useRouter();
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      if (page === "logout") {
        endDemoSession();
      } else {
        const selectedRole = page === "login" ? new FormData(event.currentTarget).get("role") : null;
        const role = roles.find((option) => option === selectedRole) ?? "student";
        startDemoSession(role);
      }
    } catch {
      setError("Не удалось изменить демо-сеанс. Проверьте доступ к хранилищу браузера и повторите попытку.");
      return;
    }

    router.replace(page === "logout" ? siteRoutes.login.path : siteRoutes.dashboard.path);
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
      <p className="text-sm leading-6 text-muted">{descriptions[page]}</p>
      {page !== "logout" && (
        <>
          <p id="demo-credentials-hint" className="text-xs leading-5 text-muted">
            В полях уже стоят вымышленные данные. Их можно оставить для быстрого входа.
          </p>
          <Field htmlFor="demo-email" label="Email">
            <Input id="demo-email" type="email" defaultValue="student@example.com" required
              aria-describedby="demo-credentials-hint" />
          </Field>
          <Field htmlFor="demo-password" label="Пароль" hint="Минимум 8 символов.">
            <Input id="demo-password" type="password" defaultValue="demo-pass" required minLength={8}
              aria-describedby="demo-credentials-hint demo-password-hint" />
          </Field>
        </>
      )}
      {page === "login" && (
        <Field htmlFor="demo-role" label="Роль для демонстрации">
          <Select id="demo-role" name="role" defaultValue="student">
            {roles.map((role) => <option key={role} value={role}>{demoRoleLabels[role]}</option>)}
          </Select>
        </Field>
      )}
      <Button type="submit" className="w-full">{actions[page]}</Button>
      {error && <p role="alert" className="text-sm font-medium">{error}</p>}
    </form>
  );
}
