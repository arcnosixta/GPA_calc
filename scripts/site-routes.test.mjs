import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = join(root, "src/app");
const source = readFileSync(join(root, "src/lib/site-routes.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { siteRoutes, navigationSections } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);
const routes = Object.values(siteRoutes);

function pagePaths(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return pagePaths(path);
    if (entry.name !== "page.tsx") return [];
    const segments = relative(app, folder).split(sep).filter((part) => part && !part.startsWith("("));
    return ["/" + segments.join("/")];
  });
}

test("реестр точно покрывает все созданные страницы без повторяющихся URL", () => {
  const urls = routes.map((route) => route.path);
  assert.equal(new Set(urls).size, urls.length);
  assert.deepEqual([...urls].sort(), pagePaths(app).sort());
  assert.equal(urls.length, 29);
  for (const route of routes) {
    assert.ok(route.title && route.summary);
    assert.ok(["kural", "akylbek", "koishyman"].includes(route.owner));
    assert.match(route.path, /^\/(?:[a-z-]+(?:\/[a-z-]+)*)?$/);
  }
});

test("навигация содержит все дополнительные страницы и только существующие маршруты", () => {
  const ids = navigationSections.flatMap((section) => section.routes);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(siteRoutes[id], "Неизвестный маршрут: " + id);
  const primary = ["home", "dashboard", "setup", "subjects", "management"];
  assert.deepEqual([...primary, ...ids].sort(), Object.keys(siteRoutes).sort());
});

test("этапы README сохранены: макет будущего раздела не объявлен MVP", () => {
  const afterMvp = ["progress", "goals", "simulator", "chats", "groupChat", "subjectChat", "moderation"];
  const afterChats = ["competitions", "challenge", "achievements", "leaderboard", "competitionManagement"];
  for (const [id, route] of Object.entries(siteRoutes)) {
    const phase = afterMvp.includes(id) ? "after-mvp" : afterChats.includes(id) ? "after-chats" : "mvp";
    assert.equal(route.phase, phase, id);
  }
});

const base = process.env.SCHOLARPATH_CHECK_URL;
test("HTTP: 29 страниц доступны, внутренние ссылки корректны, весь граф достижим", { skip: !base }, async () => {
  const known = new Set(routes.map((route) => route.path));
  const graph = new Map();
  await Promise.all(routes.map(async (route) => {
    const response = await fetch(new URL(route.path, base));
    assert.equal(response.status, 200, route.path);
    const html = await response.text();
    assert.ok(html.includes(route.title), "Нет заголовка: " + route.path);
    const links = new Set();
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      if (!match[1].startsWith("/") || match[1].startsWith("//")) continue;
      const path = new URL(match[1].replaceAll("&amp;", "&"), base).pathname;
      assert.ok(known.has(path), route.path + " → неизвестная ссылка " + path);
      links.add(path);
    }
    graph.set(route.path, links);
  }));
  const expectedTransitions = [
    ["login", "register"], ["register", "verifyEmail"], ["verifyEmail", "login"],
    ["login", "forgotPassword"], ["forgotPassword", "resetPassword"], ["resetPassword", "login"],
    ["goals", "progress"], ["simulator", "progress"], ["groupChat", "chats"],
    ["subjectChat", "chats"], ["challenge", "competitions"],
  ];
  for (const [from, to] of expectedTransitions) {
    assert.ok(graph.get(siteRoutes[from].path).has(siteRoutes[to].path), from + " → " + to);
  }
  const reached = new Set(["/"]);
  for (const path of reached) for (const link of graph.get(path)) reached.add(link);
  assert.deepEqual([...reached].sort(), [...known].sort());
  const missing = await fetch(new URL("/page-that-does-not-exist", base));
  assert.equal(missing.status, 404);
});
