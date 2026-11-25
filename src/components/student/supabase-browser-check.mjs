// Isolated headless Chrome: --remote-debugging-port=9246, fresh user-data-dir.
// Runs UI against a simulated transport; never creates cloud accounts or sends mail.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const base = process.env.SCHOLARPATH_CHECK_URL ?? "http://localhost:3100";
const tabs = await (await fetch("http://127.0.0.1:9246/json/list")).json();
const target = tabs.find((tab) => tab.type === "page");
assert.ok(target, "Start isolated headless Chrome on port 9246");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  const request = pending.get(message.id);
  if (!request) return;
  clearTimeout(request.timer); pending.delete(message.id);
  if (message.error) request.reject(message.error); else request.resolve(message.result);
});
function call(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
async function wait(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Not ready: ${expression}\n${await evaluate("document.body.innerText")}`);
}
async function navigate(path) {
  await call("Network.clearBrowserCookies");
  await call("Page.navigate", { url: base + path });
  await wait("document.readyState === 'complete'");
}
async function fill(id, value) {
  await evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', {bubbles:true})); })()`);
}
async function select(id, value) {
  await evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', {bubbles:true})); })()`);
}
async function submit(id) { await evaluate(`document.getElementById(${JSON.stringify(id)}).closest('form').requestSubmit()`); }

function installTransport() {
  const nativeFetch = window.fetch.bind(window);
  const owner = localStorage.getItem("qa-owner") ?? "a";
  const key = "qa-state-" + owner;
  const current = JSON.parse(localStorage.getItem(key) ?? "null") ?? { profile: { id: owner, first_name: "", last_name: "", group_id: null }, rows: [], forecasts: [] };
  const save = () => localStorage.setItem(key, JSON.stringify(current));
  const user = { id: owner, email: owner + "@example.test", aud: "authenticated", role: "authenticated", user_metadata: {}, app_metadata: {}, created_at: new Date().toISOString() };
  const token = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + btoa(JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 3600 })) + ".test";
  if (localStorage.getItem("qa-signed-in") === "yes") {
    const session = { access_token: token, refresh_token: "test", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user };
    document.cookie = "sb-hygmzyylxejrvobrvcwm-auth-token=base64-" + btoa(JSON.stringify(session)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "") + "; path=/";
  }
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url ?? input.toString(), location.origin);
    const json = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }));
    if (url.pathname === "/api/backend/account") {
      if (localStorage.getItem("qa-account-error")) return json({ error: "account_unavailable" }, 503);
      if (localStorage.getItem("qa-signed-in") !== "yes") return json({ error: "unauthenticated" }, 401);
      return json({ user, role: "student", profile: current.profile });
    }
    if (!url.hostname.endsWith("supabase.co")) return nativeFetch(input, init);
    if (url.pathname === "/auth/v1/user") return json(user);
    if (url.pathname.startsWith("/auth/")) return json({ code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" }, 400);
    const table = url.pathname.split("/").pop();
    const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
    const method = init.method ?? "GET";
    const filters = (row) => [...url.searchParams].every(([key, value]) => !value.startsWith("eq.") || String(row[key]) === value.slice(3));
    const catalog = {
      universities: [{ id: "u", name: "Тестовый университет" }],
      programs: [{ id: "p", university_id: "u", name: "Информатика" }],
      study_groups: [{ id: "g", program_id: "p", name: "ИС-24", year: 2 }],
      subjects: [{ id: "math", program_id: "p", code: "MAT", title: "Математика и очень длинное название учебной дисциплины", credits: 3, archived_at: null }],
      semesters: [{ number: 3, title: "Семестр 3", is_active: true }],
      study_plan_items: [{ group_id: "g", subject_id: "math", semester: 3, program_id: "p" }],
      academic_calendars: [],
    };
    if (table === "profiles" && method === "PATCH") { Object.assign(current.profile, body); save(); return json(current.profile); }
    if (table === "student_subjects" && method === "POST") {
      if (current.rows.length) return json({ code: "23505" }, 409);
      const row = { ...catalog.subjects[0], ...body, id: "00000000-0000-4000-8000-000000000001", student_id: owner, rk1: null, rk2: null, exam: null, final_score: null, grade: null, grade_points: null };
      current.rows.push(row); save(); return json(row);
    }
    if (table === "assessments") {
      if (method === "POST" && current.assessed) return json({ code: "23505" }, 409);
      const row = current.rows[0]; Object.assign(row, body); current.assessed = true;
      row.final_score = [row.rk1, row.rk2, row.exam].some((value) => value === null) ? null : Math.round((row.rk1 * 30 + row.rk2 * 30 + row.exam * 40) / 100);
      row.grade = row.final_score === null ? null : row.final_score === 100 ? "A" : row.final_score === 0 ? "F" : "B";
      row.grade_points = row.grade === "A" ? 4 : row.grade === "F" ? 0 : null;
      save(); return json({ student_subject_id: row.id });
    }
    if (table === "grade_forecasts" && method !== "GET") { current.forecasts = method === "DELETE" ? [] : [{ student_subject_id: current.rows[0].id, grade: body.grade }]; save(); return json(current.forecasts[0] ?? null); }
    const rows = table === "student_subjects" || table === "student_results" ? current.rows.filter(filters) : table === "grade_forecasts" ? current.forecasts : catalog[table] ?? [];
    const headers = new Headers(init.headers);
    return json(headers.get("accept")?.includes("vnd.pgrst.object") ? rows[0] : rows);
  };
}

try {
  await call("Page.enable"); await call("Runtime.enable");
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `(${installTransport.toString()})()` });
  await navigate("/login");
  await evaluate("localStorage.clear()");
  for (const width of [320, 360]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 1, mobile: true });
    for (const path of ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"]) {
      await navigate(path); await wait("document.querySelector('main form')");
      assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, path);
      assert.equal(await evaluate("Boolean(document.querySelector('select[name=role]'))"), false);
    }
  }
  await navigate("/login"); await wait("document.getElementById('auth-email')");
  await evaluate("document.getElementById('auth-email').focus()");
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", windowsVirtualKeyCode: 9 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate("document.activeElement.id"), "auth-password");
  await fill("auth-email", "test@example.test"); await fill("auth-password", "wrong-password"); await submit("auth-email");
  await wait("document.body.innerText.includes('Неверный email или пароль')");
  await navigate("/verify-email?error=expired"); await wait("document.body.innerText.includes('Ссылка недействительна')");
  await evaluate("localStorage.setItem('qa-account-error','yes')");
  await navigate("/dashboard"); await wait("document.body.innerText.includes('Повторить подключение')");
  assert.equal(await evaluate("location.pathname"), "/dashboard");
  await evaluate("localStorage.removeItem('qa-account-error')");
  await navigate("/dashboard"); await wait("location.pathname === '/login'");
  await evaluate("localStorage.setItem('qa-signed-in','yes')");
  await navigate("/dashboard?year=2026-2027"); await wait("document.getElementById('first-name')");
  await fill("first-name", "Первый"); await fill("last-name", "Студент");
  await select("university", "u"); await select("study-group", "g"); await submit("first-name");
  await wait("document.body.innerText.includes('План пока пуст')");
  await navigate("/setup?year=2026-2027"); await wait("document.getElementById('plan-subject')");
  await select("plan-subject", "math"); await submit("plan-subject"); await wait("document.body.innerText.includes('Предмет есть')");
  await submit("plan-subject"); await wait("!document.querySelector('button[type=submit]').disabled");
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('qa-state-a')).rows.length"), 1);
  const detail = "/subjects/00000000-0000-4000-8000-000000000001?year=2026-2027";
  await navigate(detail); await wait("document.getElementById('rk1')");
  for (const id of ["rk1", "rk2", "exam"]) await fill(id, "100");
  await submit("rk1"); await wait("document.body.innerText.includes('Баллы сохранены')");
  await select("forecast", "F"); await submit("forecast"); await wait("document.body.innerText.includes('Прогноз сохранён')");
  await navigate(detail); await wait("document.getElementById('rk1')?.value === '100'");
  assert.equal(await evaluate("document.getElementById('forecast').value"), "F");
  await fill("rk1", "0"); await fill("rk2", ""); await submit("rk1"); await wait("document.body.innerText.includes('Баллы сохранены')");
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('qa-state-a')).rows[0].grade"), null);
  for (const width of [320, 360]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  }
  await evaluate("localStorage.setItem('qa-owner','b')");
  await navigate("/dashboard"); await wait("document.getElementById('first-name')");
  assert.equal(await evaluate("document.getElementById('first-name').value"), "");
  await evaluate("localStorage.setItem('qa-owner','a')");
  await navigate(detail); await wait("document.getElementById('rk1')?.value === '0'");
  assert.equal(await evaluate("document.getElementById('rk2').value"), "");
  assert.deepEqual(errors, []);
  const screenshot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(".next/supabase-qa.png", Buffer.from(screenshot.data, "base64"));
  console.log("PASS: simulated two-account UI, profile, duplicate subject, assessment null/zero/readback, forecast isolation, reload, 401/503, auth errors, keyboard, 320/360px. No live signup/email tested.");
} finally { socket.close(); }
