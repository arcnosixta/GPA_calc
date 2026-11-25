import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createContext, Script } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./supabase-auth-form.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});

function render(page, { enabled = "true", oauth, password, search = "" } = {}) {
  const calls = [];
  const effects = [];
  const events = new Map();
  const updates = [];
  const auth = {
    signInWithOAuth: async (request) => {
      calls.push({ kind: "google", request });
      return oauth ? await oauth : { data: { url: "https://google.test" }, error: null };
    },
    signInWithPassword: async () => {
      calls.push({ kind: "email" });
      return password ? await password : { error: null };
    },
  };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: { useEffect: (effect) => effects.push(effect), useRef: (value) => ({ current: value }), useState: (value) => [value, (next) => updates.push(next)] },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/navigation": { useRouter: () => ({ replace() {}, refresh() {} }) },
    "@/components/ui": { Button() {}, Field() {}, Input() {} },
    "@/lib/supabase/client": { createBrowserSupabaseClient: () => ({ auth }) },
    "@/lib/supabase/config": { isSupabaseConfigured: () => true },
    "@/lib/data/errors": { dataErrorMessage: () => "Request failed", invalid: (message) => { throw new Error(message); } },
  };
  const context = createContext({
    exports: {}, require: (name) => modules[name],
    process: { env: { NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: enabled } },
    window: {
      location: { origin: "https://scholarpath.test", search },
      addEventListener: (name, callback) => events.set(name, callback),
      removeEventListener: (name) => events.delete(name),
    },
    URLSearchParams, queueMicrotask,
    FormData: class { get(name) { return name === "email" ? "student@example.com" : "password"; } },
  });
  new Script(outputText).runInContext(context);
  const form = context.exports.SupabaseAuthForm({ page });
  effects.forEach((effect) => effect());
  const google = form.props.children.find((child) => child?.props?.children === "Войти через Google");
  return { form, google, calls, events, updates };
}

test("Google is visible only with an explicit true flag on login and registration", () => {
  for (const page of ["login", "register"]) {
    assert.ok(render(page).google);
    for (const enabled of ["", "false", "1"]) assert.equal(render(page, { enabled }).google, undefined);
  }
  assert.equal(render("verifyEmail").google, undefined);
});

test("Google uses the existing callback and blocks duplicate Google and email requests", async () => {
  let finish;
  const oauth = new Promise((resolve) => { finish = resolve; });
  const { form, google, calls } = render("login", { oauth });
  assert.equal(google.props.type, "button");
  const pending = google.props.onClick();
  await google.props.onClick();
  await form.props.onSubmit({ preventDefault() {}, currentTarget: {} });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].request.provider, "google");
  assert.equal(calls[0].request.options.redirectTo, "https://scholarpath.test/auth/callback");
  finish({ data: { url: "https://google.test" }, error: null });
  await pending;
  await google.props.onClick();
  assert.equal(calls.length, 1);
});

test("email requests block Google until the email request completes", async () => {
  let finish;
  const password = new Promise((resolve) => { finish = resolve; });
  const { form, google, calls } = render("login", { password });
  const pending = form.props.onSubmit({ preventDefault() {}, currentTarget: {} });
  await google.props.onClick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].kind, "email");
  finish({ error: null });
  await pending;
});

test("an OAuth error allows a manual retry", async () => {
  const oauth = Promise.resolve({ data: null, error: { code: "provider_disabled" } });
  const { google, calls } = render("login", { oauth });
  await google.props.onClick();
  await google.props.onClick();
  assert.equal(calls.length, 2);
});

test("returning from Google with browser Back releases the restored page", async () => {
  const { google, calls, events } = render("login");
  await google.props.onClick();
  events.get("pageshow")({ persisted: true });
  await google.props.onClick();
  assert.equal(calls.length, 2);
});

test("OAuth callback errors explain the Google failure", async () => {
  const { updates } = render("login", { search: "?error=oauth" });
  await Promise.resolve();
  assert.ok(updates.some((message) => typeof message === "string" && /вход через Google/i.test(message)));
  assert.equal(updates.some((message) => typeof message === "string" && /ссылка.*истекла/i.test(message)), false);
});
