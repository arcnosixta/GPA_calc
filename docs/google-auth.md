# Вход через Google

Код входа через Google подготовлен для режима Supabase. Кнопка на `/login` и `/register` появляется после установки `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` и новой сборки. Включать её нужно после сохранения действительных OAuth-настроек провайдера.

## Google Cloud

В Google Auth Platform создайте OAuth-клиент типа **Web application** для ScholarPath. Приложению достаточно областей `openid`, `userinfo.email` и `userinfo.profile`.

Authorized JavaScript origins:

```text
https://scholarpath-arcnosixtas-projects.vercel.app
https://scholarpath-zeta.vercel.app
```

Authorized redirect URI:

```text
https://hygmzyylxejrvobrvcwm.supabase.co/auth/v1/callback
```

Client ID и Client Secret сохраняются в Supabase → Authentication → Sign In / Providers → Google. Client Secret вводится только в настройках провайдера: он не нужен в коде, Git, клиентских переменных или чате.

## Supabase и Vercel

Site URL настроен на `https://scholarpath-arcnosixtas-projects.vercel.app`. Для обоих production-адресов разрешены `/auth/callback` и `/auth/callback?next=/reset-password`.

После включения Google-провайдера задайте `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` в Vercel Production и выполните новую сборку. Проверьте переход из формы входа в Google, возврат на сайт, заполнение профиля, выход и повторный вход. Новый аккаунт получает роль студента; роли назначаются отдельно через БД.

Вход через Google сохраняет проверку email у провайдера и не требует письма Supabase. Для массовой регистрации по email и паролю по-прежнему нужен SMTP: квота отправки писем настройкой Google не изменяется.

[Инструкция Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
