import Link from "next/link";
import { Badge, Button, Card, Field, Input, PageHeader, buttonStyles } from "@/components/ui";
import { siteRoutes } from "@/lib/site-routes";
import { DemoSessionForm, type DemoSessionPage } from "./demo-session-form";

type AuthPage = DemoSessionPage | "verifyEmail" | "forgotPassword" | "resetPassword";
type AuthField = { id: string; label: string; type: "text" | "email" | "password"; placeholder: string };

const forms: Partial<Record<AuthPage, { action: string; fields: AuthField[] }>> = {
  forgotPassword: {
    action: "Получить ссылку",
    fields: [{ id: "recovery-email", label: "Email аккаунта", type: "email", placeholder: "student@example.edu" }],
  },
  resetPassword: {
    action: "Обновить пароль",
    fields: [
      { id: "new-password", label: "Новый пароль", type: "password", placeholder: "Придумайте новый пароль" },
      { id: "repeat-password", label: "Повторите пароль", type: "password", placeholder: "Введите пароль ещё раз" },
    ],
  },
};

function AuthLinks({ page }: { page: AuthPage }) {
  const linkClass = "rounded text-sm font-medium underline underline-offset-4";
  if (page === "login") {
    return <div className="flex flex-wrap gap-x-6 gap-y-3">
      <Link href={siteRoutes.register.path} className={linkClass}>Создать аккаунт</Link>
      <Link href={siteRoutes.forgotPassword.path} className={linkClass}>Забыли пароль?</Link>
    </div>;
  }
  if (page === "register") {
    return <div className="space-y-4">
      <Link href={siteRoutes.login.path} className={linkClass}>Уже есть аккаунт? Войти</Link>
      <p><Link href={siteRoutes.verifyEmail.path} className={linkClass}>Посмотреть экран подтверждения email</Link></p>
    </div>;
  }
  if (page === "verifyEmail") {
    return <div className="flex flex-wrap gap-4">
      <Link href={siteRoutes.login.path} className={buttonStyles()}>Вернуться ко входу</Link>
      <Link href={siteRoutes.register.path} className={buttonStyles("secondary")}>К регистрации</Link>
    </div>;
  }
  if (page === "forgotPassword") {
    return <div className="space-y-4">
      <Link href={siteRoutes.login.path} className={linkClass}>Вернуться ко входу</Link>
      <p><Link href={siteRoutes.resetPassword.path} className={linkClass}>Посмотреть экран нового пароля</Link></p>
    </div>;
  }
  if (page === "resetPassword") {
    return <div className="flex flex-wrap gap-x-6 gap-y-3">
      <Link href={siteRoutes.login.path} className={linkClass}>Вернуться ко входу</Link>
      <Link href={siteRoutes.forgotPassword.path} className={linkClass}>Запросить другую ссылку</Link>
    </div>;
  }
  return <div className="flex flex-wrap gap-4">
    <Link href={siteRoutes.dashboard.path} className={buttonStyles("secondary")}>Вернуться на главную</Link>
  </div>;
}

export function AuthScaffold({ page }: { page: AuthPage }) {
  const route = siteRoutes[page];
  const form = forms[page];
  const isDemoSessionPage = page === "login" || page === "register" || page === "logout";
  return (
    <>
      <PageHeader eyebrow="Аккаунт ScholarPath" title={route.title} description={route.summary} />
      <Card className="space-y-6">
        <Badge>{isDemoSessionPage ? "Демо-сеанс" : "Каркас страницы"}</Badge>

        {isDemoSessionPage && <DemoSessionForm key={page} page={page} />}

        {form && (
          <div role="group" aria-label="Образец формы аккаунта" className="space-y-4">
            {form.fields.map((field) => (
              <Field key={field.id} label={field.label} htmlFor={field.id}>
                <Input id={field.id} type={field.type} placeholder={field.placeholder} disabled />
              </Field>
            ))}
            <Button type="button" disabled className="w-full">
              {form.action}
            </Button>
            <p className="text-xs leading-5 text-muted">
              Поля и действие пока недоступны. Здесь показан шаблон формы, аккаунт и пароль не изменяются.
            </p>
          </div>
        )}

        {page === "verifyEmail" && (
          <div className="space-y-4 text-sm leading-6">
            <p>В полной версии здесь будет подтверждение адреса из регистрационной формы.</p>
            <p className="rounded-lg bg-surface-muted p-4"><span className="font-semibold">Пример адреса:</span> student@example.edu</p>
            <p className="text-muted">Это пример экрана. Для демонстрационного входа подтверждение email не требуется.</p>
          </div>
        )}
        <div className="border-t border-border pt-6"><AuthLinks page={page} /></div>
      </Card>
    </>
  );
}
