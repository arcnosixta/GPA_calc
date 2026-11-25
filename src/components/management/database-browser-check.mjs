// UI checks with simulated transport in an isolated headless Chrome profile.
// This does not test live Supabase Auth/RLS and does not create cloud accounts.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const base = process.env.SCHOLARPATH_CHECK_URL ?? "http://127.0.0.1:3111";
const port = process.env.SCHOLARPATH_CDP_PORT ?? "9251";
const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = tabs.find((tab) => tab.type === "page");
assert.ok(target, `Start isolated headless Chrome on port ${port}`);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map(), runtimeErrors = [];
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails.text);
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
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Not ready: ${expression}\n${await evaluate("document.body.innerText")}`);
}
const text = (value) => wait(`document.body.innerText.includes(${JSON.stringify(value)})`);
async function navigate(path) {
  await call("Network.clearBrowserCookies");
  await call("Page.navigate", { url: base + path });
  await wait(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(path.split("?")[0])}`);
}
async function fill(id, value) {
  await evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', {bubbles:true})); })()`);
}
async function select(id, value) {
  await evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', {bubbles:true})); })()`);
}
async function click(label) {
  await evaluate(`(() => { const el = [...document.querySelectorAll('button,summary')].find(el => el.textContent.trim() === ${JSON.stringify(label)} && el.getClientRects().length); if(!el || el.disabled) throw new Error('Unavailable action: '+${JSON.stringify(label)}); el.click(); })()`);
}
async function rowAction(value, label) {
  await evaluate(`(() => { const row = [...document.querySelectorAll('tbody tr')].find(el=>el.textContent.includes(${JSON.stringify(value)})); const button=[...row.querySelectorAll('button')].find(el=>el.textContent.trim()===${JSON.stringify(label)}); if(!button || button.disabled) throw new Error('Unavailable row action'); button.click(); })()`);
}
async function submit(id) { await evaluate(`document.getElementById(${JSON.stringify(id)}).closest('form').requestSubmit()`); }
async function role(value) { await evaluate(`localStorage.setItem('management-qa-owner',${JSON.stringify(value)})`); }
const state = (expression) => evaluate(`(() => { const db=JSON.parse(localStorage.getItem('management-qa-db')); return ${expression}; })()`);

function installTransport() {
  const nativeFetch = window.fetch.bind(window);
  const owner = localStorage.getItem("management-qa-owner") ?? "admin";
  const profiles = ["admin", "moderator", "student", "target", "other"].map((id) => ({ id, first_name: id, last_name: "Тестовый", group_id: id === "other" ? "foreign" : "group" }));
  const weeks = (start, end = start) => ({ kind: "weeks", start, end });
  const initial = {
    universities: [{ id: "university", name: "Учебный университет", created_by: null }, { id: "foreign-university", name: "Чужой университет", created_by: null }],
    programs: [{ id: "program", name: "Информатика", university_id: "university" }, { id: "foreign-program", name: "Другая программа", university_id: "foreign-university" }],
    study_groups: [{ id: "group", program_id: "program", name: "ИС-24", year: 2 }, { id: "foreign", program_id: "foreign-program", name: "Чужая группа", year: 1 }],
    subjects: [{ id: "math", program_id: "program", code: "MAT", title: "Математика", credits: 3, archived_at: null }, { id: "foreign-subject", program_id: "foreign-program", code: "FOR", title: "Чужой предмет", credits: 5, archived_at: null }],
    semesters: [{ number: 1, title: "Осенний семестр", is_active: true }, { number: 2, title: "Весенний семестр", is_active: true }],
    study_plan_items: [{ group_id: "group", subject_id: "math", program_id: "program", semester: 1 }, { group_id: "foreign", subject_id: "foreign-subject", program_id: "foreign-program", semester: 1 }],
    profiles, user_roles: profiles.map(({ id }) => ({ user_id: id, role: ["admin", "moderator"].includes(id) ? id : "student" })),
    moderator_groups: [{ moderator_id: "moderator", group_id: "group", moderator_role: "moderator" }],
    academic_calendars: [{ id: "calendar", university_id: "university", academic_year: "2026-2027", scope: "Бакалавриат, 1 курс", status: "local", source_id: "source" }],
    academic_sources: [{ id: "source", university_id: "university", academic_year: "2026-2027", title: "Учебный источник", url: "https://example.edu/calendar.pdf", checked_at: "2026-11-25", scope: "Бакалавриат", note: "Тестовые данные" }],
    calendar_terms: [{ id: "autumn", calendar_id: "calendar", season: "autumn", period: weeks(1, 15), rk1: weeks(7), rk2: weeks(14) }, { id: "spring", calendar_id: "calendar", season: "spring", period: weeks(16, 30), rk1: weeks(22), rk2: weeks(29) }],
    student_results: profiles.flatMap(({ id }) => [
      { id: `result-${id}`, student_id: id, subject_id: "math", academic_year: "2026-2027", semester: 1, code: "MAT", title: "Математика — зафиксированное название", credits: 3, rk1: 100, rk2: 100, exam: 100, final_score: 100, grade: "A", grade_points: 4 },
      { id: `past-${id}`, student_id: id, subject_id: "math", academic_year: "2025-2026", semester: 2, code: "OLD", title: "Прошлый семестр", credits: 2, rk1: null, rk2: null, exam: null, final_score: null, grade: null, grade_points: null },
    ]), grade_forecasts: [],
  };
  const db = JSON.parse(localStorage.getItem("management-qa-db") ?? "null") ?? initial;
  const save = () => localStorage.setItem("management-qa-db", JSON.stringify(db));
  save();
  const user = { id: owner, email: `${owner}@example.test`, aud: "authenticated", role: "authenticated", user_metadata: {}, app_metadata: {}, created_at: "2026-11-25T00:00:00Z" };
  const token = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + btoa(JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 3600 })) + ".test";
  const session = { access_token: token, refresh_token: "test", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user };
  document.cookie = "sb-hygmzyylxejrvobrvcwm-auth-token=base64-" + btoa(JSON.stringify(session)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "") + "; path=/";
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url ?? input.toString(), location.origin);
    const json = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }));
    const currentRole = db.user_roles.find((row) => row.user_id === owner)?.role;
    if (url.pathname === "/api/backend/account") {
      if (localStorage.getItem("management-qa-account-error")) return json({ error: "account_unavailable" }, 503);
      return json({ user, role: currentRole, profile: db.profiles.find((row) => row.id === owner) });
    }
    if (!url.hostname.endsWith("supabase.co")) return nativeFetch(input, init);
    if (url.pathname === "/auth/v1/user") return json(user);
    if (url.pathname.startsWith("/auth/")) return json({ code: "invalid_credentials", msg: "Simulated transport" }, 400);
    const table = url.pathname.split("/").pop();
    const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
    const method = init.method ?? "GET";
    const headers = new Headers(init.headers);
    const failure = JSON.parse(localStorage.getItem("management-qa-failure") ?? "null");
    if (failure?.table === table && failure.method === method) {
      localStorage.removeItem("management-qa-failure"); return json({ code: failure.code, message: "Simulated error" }, failure.status ?? 400);
    }
    const requests = JSON.parse(localStorage.getItem("management-qa-requests") ?? "[]");
    requests.push({ table, method, body, query: url.search }); localStorage.setItem("management-qa-requests", JSON.stringify(requests));
    if (url.pathname.includes("/rpc/")) {
      if (table !== "admin_set_user_role" || currentRole !== "admin") return json({ code: "42501" }, 403);
      const target = db.user_roles.find((row) => row.user_id === body.target_user_id);
      if (!target || target.role === "admin" || target.user_id === owner || !["student", "moderator"].includes(body.new_role)) return json({ code: "42501" }, 403);
      target.role = body.new_role;
      if (target.role === "student") db.moderator_groups = db.moderator_groups.filter((row) => row.moderator_id !== target.user_id);
      save(); return json(null);
    }
    const filters = (row) => [...url.searchParams].every(([key, value]) => {
      if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
      if (value === "is.null") return row[key] === null;
      if (value.startsWith("in.(")) return value.slice(4, -1).split(",").includes(String(row[key]));
      return true;
    });
    let rows = db[table] ?? [];
    if (table === "student_results") rows = rows.filter((row) => row.student_id === owner);
    if (currentRole !== "admin" && table === "profiles") rows = rows.filter((row) => row.id === owner);
    if (currentRole !== "admin" && table === "user_roles") rows = rows.filter((row) => row.user_id === owner);
    if (currentRole !== "admin" && table === "moderator_groups") rows = rows.filter((row) => row.moderator_id === owner);
    let selected = rows.filter(filters);
    if (method !== "GET") {
      if (currentRole === "student" || (["user_roles", "moderator_groups", "study_groups", "semesters", "academic_sources"].includes(table) && currentRole !== "admin")) return json({ code: "42501" }, 403);
      if (method === "POST") {
        const duplicate = table === "subjects" ? rows.some((row) => row.program_id === body.program_id && !row.archived_at && row.code.toLowerCase() === body.code.toLowerCase())
          : table === "moderator_groups" ? rows.some((row) => row.moderator_id === body.moderator_id && row.group_id === body.group_id)
          : table === "universities" ? rows.some((row) => row.name === body.name) : false;
        if (duplicate) return json({ code: "23505" }, 409);
        const created = { ...body };
        if (!["moderator_groups", "semesters"].includes(table)) created.id = `qa-${table}-${rows.length + 1}`;
        if (table === "universities") created.created_by = owner;
        if (table === "subjects") created.archived_at = null;
        if (table === "moderator_groups") created.moderator_role = "moderator";
        db[table].push(created); selected = [created];
      } else if (method === "PATCH") selected.forEach((row) => Object.assign(row, body));
      else if (method === "DELETE") db[table] = db[table].filter((row) => !selected.includes(row));
      save();
      if (localStorage.getItem("management-qa-lose-response") === `${table}:${method}`) {
        localStorage.removeItem("management-qa-lose-response"); return json({ code: "NETWORK" }, 503);
      }
    }
    if (headers.get("accept")?.includes("vnd.pgrst.object")) return selected.length === 1 ? json(selected[0]) : json({ code: "PGRST116", details: "The result contains 0 rows" }, 406);
    return json(selected);
  };
}

try {
  await call("Page.enable"); await call("Runtime.enable");
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `(${installTransport.toString()})()` });
  await navigate("/login"); await evaluate("localStorage.clear()");
  await navigate("/management"); await wait("document.getElementById('database-subject-search')");
  for (const width of [320, 360, 768, 1024, 1440]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, `catalog width ${width}`);
  }
  await evaluate("document.getElementById('database-subject-search').focus()");
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", windowsVirtualKeyCode: 9 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate("document.activeElement.id"), "database-subject-group");
  await fill("database-subject-search", "не существующий предмет"); await text("Предметы не найдены"); await fill("database-subject-search", "");

  await click("Добавить предмет"); await fill("database-subject-title", "Новый предмет"); await fill("database-subject-code", "QA1"); await fill("database-subject-credits", "5"); await select("database-subject-program", "program"); await submit("database-subject-title"); await text("Предмет «Новый предмет» подтверждён базой.");
  await click("Добавить предмет"); await fill("database-subject-title", "Повтор сохранения"); await fill("database-subject-code", "QA2"); await select("database-subject-program", "program");
  await evaluate("localStorage.setItem('management-qa-lose-response','subjects:POST')");
  await submit("database-subject-title"); await text("Нет соединения с базой"); await submit("database-subject-title"); await text("Предмет «Повтор сохранения» подтверждён базой.");
  assert.equal(await state("db.subjects.filter(row=>row.code==='QA2').length"), 1);
  await rowAction("Математика", "Изменить"); await fill("database-subject-title", "Математика обновлена"); await fill("database-subject-credits", "9"); await submit("database-subject-title"); await text("Предмет «Математика обновлена» подтверждён базой.");
  await rowAction("Математика обновлена", "Архивировать"); await click("Подтвердить архивирование"); await text("архивирован в базе");
  assert.equal(await state("db.student_results.find(row=>row.id==='result-admin').credits"), 3);
  assert.equal(await state("db.student_results.find(row=>row.id==='result-admin').grade"), "A");
  await navigate("/management/history"); await text("Математика — зафиксированное название");
  await select("db-history-year", "2025-2026"); await text("Показано записей: 1 из 2");
  assert.equal(await evaluate("document.querySelector('tbody').innerText.includes('Математика')"), false);
  await click("Сбросить фильтры и сортировку"); await fill("db-history-search", "MAT"); await text("Показано записей: 1 из 2");
  await select("db-history-grade", "A"); await select("db-history-sort", "grade-desc"); await text("Математика — зафиксированное название");

  for (const [path, name, parent] of [["universities", "Новый вуз", null], ["programs", "Новая программа", "university"], ["groups", "Новая группа", "program"]]) {
    await navigate(`/management/${path}`); await text("Добавить запись"); await click("Добавить запись"); await fill("database-directory-name", name);
    if (parent) await select("database-directory-parent", parent);
    if (path === "groups") await fill("database-directory-year", "3");
    await submit("database-directory-name"); await text(`Запись «${name}» подтверждена базой.`);
  }

  await navigate("/management/semesters"); await text("Учебный университет · 2026-2027");
  await select("database-calendar-university", "university"); await click("Осенний семестр"); await click("Изменить сроки семестра");
  await fill("autumn-rk1-end", "8"); await text("Было"); await text("Станет"); await submit("autumn-rk1-end"); await text("Сроки этого семестра сохранены в базе.");
  await click("Весенний семестр"); await click("Изменить сроки семестра"); await fill("spring-rk1-end", "23"); await submit("spring-rk1-end"); await text("Сроки этого семестра сохранены в базе.");
  assert.equal(await state("db.calendar_terms.find(row=>row.id==='autumn').rk1.end"), 8);
  assert.equal(await state("db.calendar_terms.find(row=>row.id==='spring').rk1.end"), 23);
  await click("Редактировать сведения об источнике"); await fill("db-source-title", "Источник после изменения"); await fill("db-source-url", "https://example.edu/calendar-2026.pdf"); await submit("db-source-title"); await text("Сведения об источнике сохранены в базе.");
  await fill("edit-db-semester-title", "Первый семестр из базы"); await submit("edit-db-semester-title"); await text("Семестр сохранён в базе.");
  for (const width of [320, 360, 768, 1024, 1440]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, `calendar width ${width}`);
  }
  await navigate("/progress?year=2026-2027"); await text("Источник после изменения"); await text("РК1: Недели 7 — 8"); await text("РК1: Недели 22 — 23");
  await navigate("/subjects/result-admin?year=2026-2027"); await text("Источник после изменения");

  await navigate("/management/users"); await wait("document.getElementById('db-role-user')"); await select("db-role-user", "target"); await select("db-user-role", "moderator"); await submit("db-user-role"); await text("Роль «Модератор» подтверждена базой данных.");
  await select("db-assignment-group", "group"); await submit("db-assignment-group"); await text("Назначение группы подтверждено базой данных.");
  await click("Снять назначение"); await click("Подтвердить снятие"); await text("Отмена назначения подтверждена базой данных.");
  assert.equal(await state("db.moderator_groups.some(row=>row.moderator_id==='target'&&row.group_id==='group')"), false);
  await select("db-user-role", "student"); await submit("db-user-role"); await text("Роль «Студент» подтверждена базой данных.");

  await role("moderator"); await navigate("/management"); await wait("document.getElementById('database-subject-search')");
  assert.equal(await evaluate("document.querySelector('tbody').innerText.includes('Чужой предмет')"), false);
  await navigate("/management/groups"); await text("ИС-24");
  assert.equal(await evaluate("document.body.innerText.includes('Добавить запись')"), false);
  await navigate("/management/users"); await text("Для вашей роли этот раздел недоступен");
  await role("student"); await navigate("/management"); await text("Для вашей роли этот раздел недоступен");
  await navigate("/management/history"); await text("Математика — зафиксированное название");
  assert.equal(await evaluate("document.body.innerText.includes('База данных · Студент')"), true);

  await role("admin"); await navigate("/management"); await wait("document.getElementById('database-subject-search')");
  for (const code of ["42501", "PGRST116"]) {
    await rowAction("Новый предмет", "Изменить"); await fill("database-subject-credits", "6");
    await evaluate(`localStorage.setItem('management-qa-failure',JSON.stringify({table:'subjects',method:'PATCH',code:${JSON.stringify(code)},status:403}))`);
    await submit("database-subject-title"); await text(code === "42501" ? "Недостаточно прав" : "Сохранение не подтверждено");
    assert.equal(await state("db.subjects.find(row=>row.code==='QA1').credits"), 5);
    await click("Отмена");
  }
  await evaluate("localStorage.setItem('management-qa-account-error','yes')"); await navigate("/management"); await text("Повторить подключение");
  await evaluate("localStorage.removeItem('management-qa-account-error')"); await click("Повторить подключение"); await wait("document.getElementById('database-subject-search')");
  await navigate("/management/semesters"); await text("Источник после изменения");
  assert.deepEqual(runtimeErrors, []);
  const screenshot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(".next/management-database-qa.png", Buffer.from(screenshot.data, "base64"));
  console.log("PASS: simulated UI, 3 roles, catalog CRUD/retry/archive snapshots, directory links, semester/calendar/source readback, shared student calendar, own history filters/search, admin role RPC/assignments, 503/42501/no-row, keyboard and 320/360/768/1024/1440px. This is NOT a live Supabase/RLS test.");
} finally { socket.close(); }
