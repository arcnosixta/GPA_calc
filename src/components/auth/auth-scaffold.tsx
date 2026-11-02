import Link from "next/link";
import { Badge, Button, Card, Field, Input, PageHeader, buttonStyles } from "@/components/ui";
import { siteRoutes } from "@/lib/site-routes";

type AuthPage = "login" | "register" | "verifyEmail" | "forgotPassword" | "resetPassword" | "logout";
type AuthField = { id: string; label: string; type: "text" | "email" | "password"; placeholder: string };

const forms: Partial<Record<AuthPage, { action: string; fields: AuthField[] }>> = {
  login: {
    action: "Войти",
    fields: [
      { id: "login-email", label: "Email", type: "email", placeholder: "student@example.edu" },
      { id: "login-password", label: "Пароль", type: "password", placeholder: "Введите пароль" },
    ],
  },
  register: {
    action: "Создать аккаунт",
    fields: [
      { id: "register-name", label: "Имя", type: "text", placeholder: "Ваше имя" },
      { id: "register-email", label: "Email", type: "email", placeholder: "student@example.edu" },
      { id: "register-password", label: "Пароль", type: "password", placeholder: "Придумайте пароль" },
    ],
  },
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
      <p><Link href={siteRoutes.verifyEmail.path} className={linkClass}>Посмотреть следующий экран</Link></p>
    </div>;
  }
  if (page === "verifyEmail") {
    return <div className="flex flex-wrap gap-4">
      <Link href={siteRoutes.setup.path} className={buttonStyles()}>Посмотреть следующий экран</Link>
      <Link href={siteRoutes.login.path} className={buttonStyles("secondary")}>Вернуться ко входу</Link>
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
    <Link href={siteRoutes.dashboard.path} className={buttonStyles()}>Вернуться в кабинет</Link>
    <Link href={siteRoutes.login.path} className={buttonStyles("secondary")}>Перейти ко входу</Link>
  </div>;
}

export function AuthScaffold({ page }: { page: AuthPage }) {
  const route = siteRoutes[page];
  const form = forms[page];
  return (
    <>
      <PageHeader eyebrow="Аккаунт ScholarPath" title={route.title} description={route.summary} />
      <Card className="space-y-6">
        <Badge>Каркас страницы</Badge>

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

        {page === "register" && (
          <p className="text-sm leading-6 text-muted">В полной версии новый пользователь получит роль студента. Другие роли назначит администратор.</p>
        )}
        {page === "verifyEmail" && (
          <div className="space-y-4 text-sm leading-6">
            <p>В полной версии здесь будет подтверждение адреса из регистрационной формы.</p>
            <p className="rounded-lg bg-surface-muted p-4"><span className="font-semibold">Пример адреса:</span> student@example.edu</p>
            <p className="text-muted">В этом просмотре письмо не отправлялось. Переход ниже показывает экран выбора учебного плана и не подтверждает email.</p>
          </div>
        )}
        {page === "logout" && (
          <div className="space-y-4 text-sm leading-6">
            <p>Этот экран показывает место выхода из аккаунта в общем пользовательском пути.</p>
            <p className="text-muted">Сейчас открыт демонстрационный интерфейс без авторизованного сеанса. Переход ко входу не выполняет серверный выход.</p>
          </div>
        )}

        <div className="border-t border-border pt-6"><AuthLinks page={page} /></div>
      </Card>
    </>
  );
}
