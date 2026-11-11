// Запуск: headless Chrome с отдельным профилем, порт 9245; npm start -- --port 3100.
import assert from "node:assert/strict";

const base = process.env.SCHOLARPATH_CHECK_URL ?? "http://localhost:3100";
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
async function onboard() {
  await wait("document.querySelector('dialog[open]')");
  await fill("#onboarding-first-name", "Акылбек");
  await fill("#onboarding-last-name", "Куат");
  await select("#onboarding-university", "central");
  assert.equal(await evaluate("document.querySelector('#onboarding-group').options.length"), 3);
  await select("#onboarding-university", "digital");
  assert.equal(await evaluate("document.querySelector('#onboarding-group').options.length"), 2);
  await select("#onboarding-university", "central");
  await select("#onboarding-group", "is-24-1");
  await click("document.querySelector('dialog button[type=submit]')");
  await wait("!document.querySelector('dialog[open]') && document.body.innerText.includes('Акылбек Куат')");
}

try {
  await call("Runtime.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: base + "/login" });
  await wait("document.querySelector('#demo-email')");
  await submitAuthForm();
  await onboard();
  assert.match(await text(), /3\.60/);
  await go("/profile", "Личный кабинет");
  assert.match(await text(), /Акылбек/);
  assert.match(await text(), /Центральный технический университет/);
  await call("Page.reload");
  await wait("document.body.innerText.includes('Акылбек') && document.querySelector('h1')?.textContent === 'Личный кабинет'");
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
  await wait("location.pathname === '/login'");
  await submitAuthForm();
  await wait("location.pathname === '/dashboard' && document.body.innerText.includes('Акылбек Куат')");
  assert.match(await text(), /Прогноз общего GPA:/);
  await go("/logout", "Выход");
  await submitAuthForm();
  await wait("location.pathname === '/login'");
  await go("/register", "Регистрация");
  await fill("#demo-email", "other-student@example.com");
  await submitAuthForm();
  await onboard();
  assert.match(await text(), /3\.60/);
  assert.deepEqual(errors, []);
  console.log("PASS: профиль, страницы предметов и GPA, сохранение после перезагрузки и повторного входа, отдельные данные другого email, Tab, 10 маршрутов × 5 ширин.");
} finally {
  await call("Browser.close").catch(() => {});
  socket.close();
}
