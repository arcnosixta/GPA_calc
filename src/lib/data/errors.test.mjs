import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./errors.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { dataErrorMessage, SessionExpiredError, invalid } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);

test("email sending limit is explained before the generic HTTP 429 message", () => {
  const message = dataErrorMessage({ code: "over_email_send_rate_limit", status: 429 });
  assert.match(message, /лимит отправки писем/i);
  assert.match(message, /администратору/i);
  assert.notEqual(message, dataErrorMessage({ status: 429 }));
});

test("IP request limit explains the connection limit and a manual retry", () => {
  const message = dataErrorMessage({ code: "over_request_rate_limit", status: 429 });
  assert.match(message, /подключения/i);
  assert.match(message, /несколько минут/i);
  assert.match(message, /вручную/i);
});

test("default SMTP recipient restriction points to administrator setup", () => {
  const message = dataErrorMessage({ code: "email_address_not_authorized", status: 422 });
  assert.match(message, /адресам команды проекта/i);
  assert.match(message, /администратору/i);
});

test("disabled OAuth provider points to site administration", () => {
  const message = dataErrorMessage({ code: "provider_disabled", status: 400 });
  assert.match(message, /провайдера пока недоступен/i);
  assert.match(message, /администратору/i);
});

test("invalid Auth parameters have a useful recovery message", () => {
  const message = dataErrorMessage({ code: "validation_failed", status: 400 });
  assert.match(message, /параметры входа/i);
  assert.match(message, /обновите страницу/i);
});

test("unrelated session and form errors keep their meaning", () => {
  assert.match(dataErrorMessage(new SessionExpiredError()), /сеанс истёк/i);
  assert.match(dataErrorMessage({ code: "invalid_credentials", status: 400 }), /неверный email или пароль/i);
  assert.match(dataErrorMessage({ code: "email_not_confirmed", status: 400 }), /подтвердите email/i);
  try { invalid("Проверьте поле"); } catch (error) { assert.equal(dataErrorMessage(error), "Проверьте поле"); }
});
