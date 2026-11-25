export class SessionExpiredError extends Error {
  constructor() { super("Сеанс истёк. Войдите снова."); }
}

export function dataErrorMessage(error: unknown): string {
  if (error instanceof SessionExpiredError) return error.message;
  const value = error as { code?: string; status?: number; message?: string } | null;
  if (value?.code === "42501") return "Недостаточно прав для этой операции. Обновите страницу или войдите снова.";
  if (value?.status === 401 || value?.code === "PGRST301") return "Сеанс истёк. Войдите снова.";
  if (["23514", "23503", "22P02"].includes(value?.code ?? "")) return "Проверьте значения формы и актуальность выбранных записей.";
  if (value?.code === "invalid_credentials") return "Неверный email или пароль.";
  if (value?.code === "email_not_confirmed") return "Подтвердите email по ссылке из письма.";
  if (value?.code === "otp_expired" || value?.code === "flow_state_expired") return "Ссылка истекла. Запросите новое письмо.";
  if (value?.status === 429) return "Слишком много попыток. Подождите и повторите запрос.";
  if (value?.code === "weak_password") return "Выберите более надёжный пароль.";
  if (error instanceof TypeError) return "Не удалось соединиться с сервером. Проверьте сеть и повторите попытку.";
  if (error instanceof Error && error.name === "ValidationError") return error.message;
  return "Сервис недоступен или запрос не выполнен. Повторите попытку; сохранение не подтверждено.";
}

export function invalid(message: string): never {
  const error = new Error(message);
  error.name = "ValidationError";
  throw error;
}
