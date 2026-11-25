"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { dataErrorMessage, invalid } from "@/lib/data/errors";

type AuthPage = "login" | "register" | "logout" | "verifyEmail" | "forgotPassword" | "resetPassword";
const actions = { login: "Войти", register: "Зарегистрироваться", logout: "Выйти", verifyEmail: "Отправить письмо повторно", forgotPassword: "Получить ссылку", resetPassword: "Обновить пароль" };

export function SupabaseAuthForm({ page }: { page: AuthPage }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    if (params.has("error")) queueMicrotask(() => { if (active) setError(params.get("error") === "unavailable" ? "Сервис подтверждения недоступен. Повторите попытку." : "Ссылка недействительна или истекла. Запросите новое письмо."); });
    if (page === "resetPassword" && isSupabaseConfigured()) {
      createBrowserSupabaseClient().auth.getUser().then(({ data, error }) => {
        if (!active) return;
        setRecoveryReady(Boolean(data.user) && !error);
        if (!data.user || error) setError("Откройте действующую ссылку восстановления из письма.");
      }).catch((error) => { if (active) setError(dataErrorMessage(error)); });
    }
    return () => { active = false; };
  }, [page]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError(""); setMessage("");
    try {
      const client = createBrowserSupabaseClient();
      const email = String(fields.get("email") ?? "").trim();
      const password = String(fields.get("password") ?? "");
      const callback = `${window.location.origin}/auth/callback`;
      if (page === "login") {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/dashboard"); router.refresh();
      } else if (page === "register") {
        const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: callback } });
        if (error) throw error;
        if (data.session) { router.replace("/dashboard"); router.refresh(); }
        else setMessage("Проверьте почту и подтвердите email. Если аккаунт уже существует, попробуйте вход или восстановление пароля.");
      } else if (page === "logout") {
        const { error } = await client.auth.signOut({ scope: "local" });
        if (error) throw error;
        router.replace("/login"); router.refresh();
      } else if (page === "forgotPassword") {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${callback}?next=/reset-password` });
        if (error) throw error;
        setMessage("Если аккаунт существует, письмо со ссылкой восстановления отправлено. Откройте ссылку в этом браузере.");
      } else if (page === "verifyEmail") {
        const { error } = await client.auth.resend({ type: "signup", email, options: { emailRedirectTo: callback } });
        if (error) throw error;
        setMessage("Запрос принят. Проверьте почту и папку «Спам».");
      } else {
        if (password !== fields.get("repeat")) invalid("Пароли не совпадают.");
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Пароль обновлён. Теперь можно открыть учебное пространство.");
      }
    } catch (error) { setError(dataErrorMessage(error)); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-4">
    {!isSupabaseConfigured() && <p role="alert">Подключение Supabase не настроено. Обратитесь к администратору.</p>}
    {page === "verifyEmail" && <p>Откройте ссылку подтверждения из письма. Чтобы запросить новое письмо, укажите email регистрации.</p>}
    {page === "logout" && <p>Завершить сеанс на этом устройстве?</p>}
    {!["logout", "resetPassword"].includes(page) && <Field htmlFor="auth-email" label="Email"><Input id="auth-email" name="email" type="email" autoComplete="email" required disabled={busy} /></Field>}
    {["login", "register", "resetPassword"].includes(page) && <Field htmlFor="auth-password" label={page === "resetPassword" ? "Новый пароль" : "Пароль"} hint={page === "login" ? undefined : "Минимум 8 символов."}>
      <Input id="auth-password" name="password" type="password" autoComplete={page === "login" ? "current-password" : "new-password"} required minLength={page === "login" ? 1 : 8} disabled={busy} />
    </Field>}
    {page === "resetPassword" && <Field htmlFor="auth-repeat" label="Повторите пароль"><Input id="auth-repeat" name="repeat" type="password" autoComplete="new-password" required minLength={8} disabled={busy} /></Field>}
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <Button type="submit" className="w-full" disabled={busy || !isSupabaseConfigured() || (page === "resetPassword" && !recoveryReady)}>{busy ? "Подождите…" : actions[page]}</Button>
    {page === "resetPassword" && message && <a className="block underline" href="/dashboard">Открыть учебное пространство</a>}
  </form>;
}
