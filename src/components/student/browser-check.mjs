// Запуск: headless Chrome с отдельным профилем, порт 9245; npm start -- --port 3100.
import assert from "node:assert/strict";

const base = process.env.SCHOLARPATH_CHECK_URL ?? "http://localhost:3100";
const firstProfile = { email: "scholarpath-qa-a@example.com", firstName: "Первый", lastName: "Демостудент" };
const secondProfile = { email: "scholarpath-qa-b@example.com", firstName: "Второй", lastName: "Демостудент" };
const tabs = await (await fetch("http://127.0.0.1:9245/json/list")).json();
const target = tabs.find((tab) => tab.type === "page" && tab.url === "about:blank");
assert.ok(target, "Нужна отдельная пустая тестовая вкладка");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
const pending = new Map();
const errors = [];
let id = 0;
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  clearTimeout(request.timer);
  if (message.error) request.reject(new Error(JSON.stringify(message.error)));
  else request.resolve(message.result);
});
function call(method, params = {}) {
  const requestId = ++id;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(method + " timed out")), 10000);
    pending.set(requestId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
async function wait(expression) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause();
  }
  throw new Error("Не дождались: " + expression);
}
const text = () => evaluate("document.body.innerText");
const visibleHeading = "[...document.querySelectorAll('main h1')].find(el => el.getClientRects().length)?.textContent";
async function select(selector, value) {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw Error('Поле не найдено'); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  await pause();
}
async function fill(selector, value) {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', {bubbles:true})); })()`);
}
async function click(expression) { await evaluate(expression + ".click()"); await pause(); }
async function submitAuthForm() {
  const button = "document.querySelector('main button[type=submit]:not(:disabled)')";
  await wait(button);
  await click(button);
}
async function go(path, heading) {
  const link = `[...document.querySelectorAll('a[href="${path}"]')].find(el => el.getClientRects().length)`;
  await wait(link);
  await click(link);
  await wait(`location.pathname === ${JSON.stringify(path)} && ${visibleHeading} === ${JSON.stringify(heading)}`);
}
async function visit(path, heading) {
  await call("Page.navigate", { url: base + path });
  await wait("location.pathname === " + JSON.stringify(path) + " && " + visibleHeading + " === " + JSON.stringify(heading));
}
const assessmentFields = ["rk1", "rk2", "exam", "finalScore"];
const assessmentInput = (field) => "#assessment-math-" + field;
const assessmentValues = () => evaluate(JSON.stringify(assessmentFields) + ".map(field => document.querySelector('#assessment-math-' + field)?.value)");
async function saveAssessment(scores) {
  for (const [field, value] of Object.entries(scores)) await fill(assessmentInput(field), value);
  await click("document.querySelector('#assessment-math-rk1').form.querySelector('button[type=submit]')");
  await wait("document.body.innerText.includes('Баллы сохранены в этом браузере.')");
}
async function assertDashboardGpa(expected) {
  const values = await evaluate(
    "[...document.querySelector('[aria-label=\"Сводка личного плана\"]').children]" +
    ".filter(card => ['Общий GPA', 'GPA семестра'].includes(card.querySelector('h2').textContent))" +
    ".map(card => card.querySelector('p').textContent)"
  );
  assert.deepEqual(values, [expected, expected]);
}
const profileVisible = ({ firstName, lastName }) => "document.body.innerText.includes(" + JSON.stringify(firstName + " " + lastName) + ")";
async function onboard(profile) {
  await wait("document.querySelector('dialog[open]')");
  await fill("#onboarding-first-name", profile.firstName);
  await fill("#onboarding-last-name", profile.lastName);
  await select("#onboarding-university", "central");
  assert.equal(await evaluate("document.querySelector('#onboarding-group').options.length"), 3);
  await select("#onboarding-university", "digital");
  assert.equal(await evaluate("document.querySelector('#onboarding-group').options.length"), 2);
  await select("#onboarding-university", "central");
  await select("#onboarding-group", "is-24-1");
  await click("document.querySelector('dialog button[type=submit]')");
  await wait("!document.querySelector('dialog[open]') && " + profileVisible(profile));
}

try {
  await call("Runtime.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: base + "/login" });
  await wait("document.querySelector('#demo-email')");
  await fill("#demo-email", firstProfile.email);
  await submitAuthForm();
  await onboard(firstProfile);
  assert.match(await text(), /3\.60/);
  await go("/profile", "Личный кабинет");
  assert.match(await text(), /Первый Демостудент/);
  assert.match(await text(), /Центральный технический университет/);
  await call("Page.reload");
  await wait(profileVisible(firstProfile) + " && document.querySelector('h1')?.textContent === 'Личный кабинет'");
  assert.equal(await evaluate("!!document.querySelector('dialog[open]')"), false);
  await go("/subjects", "Мои предметы");
  await select("#grade-math", "F");
  assert.match(await text(), /1\.20/);
  assert.match(await text(), /С оценкой: 5 · зачтено: 2/);
  await go("/subjects/math", "Математика");
  assert.match(await text(), /GPA по предмету/);
  await call("Page.reload");
  await wait("document.querySelector('#detail-grade-math')?.value === 'F'");
  await go("/dashboard", "Главная");
  assert.match(await text(), /1\.20/);
  assert.match(await text(), /Выберите хотя бы одну/);
  await select("#forecast-english", "A");
  assert.match(await text(), /Прогноз общего GPA: 2\.25/);
  assert.match(await text(), /ENG 201: A/);
  await go("/subjects", "Мои предметы");
  assert.equal(await evaluate("document.querySelector('#grade-english').value"), "");
  assert.equal(await evaluate("document.querySelector('#grade-math').value"), "F");
  await select("#grade-math", "");
  await select("#grade-programming", "");
  assert.doesNotMatch(await text(), /3\.60|1\.20/);
  assert.equal(await evaluate("[...document.querySelectorAll('section p.text-3xl')].slice(0,2).every(el => el.textContent === '—')"), true);
  await select("#grade-math", "A");
  await select("#grade-programming", "B");
  await go("/setup", "Выбор учебного плана");
  await select("#plan-group", "se-25-1");
  await click("[...document.querySelectorAll('button')].find(el => el.textContent === 'Добавить в локальный план')");
  await go("/subjects", "Мои предметы");
  await select("#subjects-semester", "1");
  await select("#grade-design", "F");
  assert.match(await text(), /1\.80/);
  assert.match(await text(), /0\.00/);
  await select("#subjects-semester", "3");
  assert.equal(await evaluate("document.querySelector('#grade-math').value"), "A");
  assert.match(await text(), /3\.60/);
  // Все целевые страницы и макеты на требуемых ширинах.
  for (const width of [320, 360, 768, 1024, 1440]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const path of ["/dashboard", "/profile", "/subjects", "/setup", "/progress", "/progress/goals", "/progress/simulator", "/chats", "/chats/group", "/chats/subject"]) {
      await call("Page.navigate", { url: base + path });
      await wait("document.querySelector('main h1') && !document.querySelector('dialog[open]')");
      assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, `${path} ${width}px`);
    }
  }
  await call("Page.navigate", { url: base + "/subjects" });
  await wait("document.querySelector('#grade-math')");
  await evaluate("document.querySelector('#grade-math').focus()");
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate("document.activeElement.getAttribute('href')"), "/subjects/programming");
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate("document.activeElement.id"), "grade-programming");
  await go("/logout", "Выход");
  await submitAuthForm();
  await wait("location.pathname === '/login' && document.querySelector('#demo-email')");
  await fill("#demo-email", firstProfile.email);
  await submitAuthForm();
  await wait("location.pathname === '/dashboard' && " + profileVisible(firstProfile));
  assert.match(await text(), /Прогноз общего GPA:/);
  await go("/logout", "Выход");
  await submitAuthForm();
  await wait("location.pathname === '/login'");
  await go("/register", "Регистрация");
  await fill("#demo-email", secondProfile.email);
  await submitAuthForm();
  await onboard(secondProfile);
  assert.match(await text(), /3\.60/);
  await go("/subjects", "Мои предметы");
  await go("/subjects/math", "Математика");
  assert.deepEqual(await assessmentValues(), ["", "", "", ""]);
  await saveAssessment({ rk1: "78", rk2: "92", exam: "0" });
  assert.deepEqual(await assessmentValues(), ["78", "92", "0", ""]);
  assert.equal(await evaluate("document.querySelector('#detail-grade-math').value"), "A");
  await go("/dashboard", "Главная");
  await assertDashboardGpa("3.60");

  await go("/subjects", "Мои предметы");
  await go("/subjects/math", "Математика");
  await saveAssessment({ finalScore: "85" });
  assert.deepEqual(await assessmentValues(), ["78", "92", "0", "85"]);
  assert.equal(await evaluate("document.querySelector('#detail-grade-math').value"), "B+");
  assert.match(await text(), /GPA по предмету\s+3\.33/);
  await call("Page.reload");
  await wait("document.querySelector('#assessment-math-finalScore')?.value === '85'");
  assert.deepEqual(await assessmentValues(), ["78", "92", "0", "85"]);
  await go("/dashboard", "Главная");
  await assertDashboardGpa("3.20");

  await select("#academic-calendar-preset", "yessenov");
  await visit("/progress", "Учебный прогресс");
  assert.match(await text(), /РК1 · 7-я неделя\s+78 из 100\s+РК2 · 15-я неделя\s+92 из 100/);
  await select("#progress-semester", "4");
  assert.match(await text(), /GPA семестра · по итоговым оценкам\s+—\s+4 семестр/);
  assert.match(await text(), /В этом семестре пока нет предметов/);

  await go("/logout", "Выход");
  await submitAuthForm();
  await wait("location.pathname === '/login' && document.querySelector('#demo-email')");
  await fill("#demo-email", secondProfile.email);
  await submitAuthForm();
  await wait("location.pathname === '/dashboard' && " + profileVisible(secondProfile));
  await assertDashboardGpa("3.20");
  await go("/subjects", "Мои предметы");
  await go("/subjects/math", "Математика");
  assert.deepEqual(await assessmentValues(), ["78", "92", "0", "85"]);

  await go("/logout", "Выход");
  await submitAuthForm();
  await wait("location.pathname === '/login' && document.querySelector('#demo-email')");
  await fill("#demo-email", firstProfile.email);
  await submitAuthForm();
  await wait("location.pathname === '/dashboard' && " + profileVisible(firstProfile));
  await call("Emulation.setDeviceMetricsOverride", { width: 360, height: 900, deviceScaleFactor: 1, mobile: false });
  await visit("/subjects/math", "Математика");
  assert.deepEqual(await assessmentValues(), ["", "", "", ""]);
  assert.equal(await evaluate("document.querySelector('#detail-grade-math').value"), "A");
  assert.ok(await evaluate("innerWidth === 360 && document.documentElement.scrollWidth <= innerWidth"), "/subjects/math 360px");
  await visit("/subjects/unknown-qa-subject", "Предмет не найден");
  assert.ok(await evaluate("document.querySelector('main a[href=\"/subjects\"]')?.textContent === 'Мои предметы'"));
  assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth"), "Неизвестный предмет 360px");
  assert.deepEqual(errors, []);
  console.log("PASS: профиль, страницы предметов и GPA, сохранение после перезагрузки и повторного входа, отдельные данные другого email, Tab, 10 маршрутов × 5 ширин.");
  console.log("PASS: РК1, РК2, нулевой экзамен, итог 85 → B+, GPA 3.20, изоляция баллов, пустой семестр и карточка предмета на 360 px.");
} finally {
  await call("Browser.close").catch(() => {});
  socket.close();
}
