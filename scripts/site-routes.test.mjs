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
const { siteRoutes, workspacePrimaryRoutes, catalogRoutes, redirectRoutes, canOpenWorkspaceRoute } = await import(
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

test("реестр точно покрывает все созданные маршруты без повторяющихся URL", () => {
  const urls = routes.map((route) => route.path);
  assert.equal(new Set(urls).size, urls.length);
  assert.deepEqual([...urls].sort(), pagePaths(app).sort());
  assert.equal(urls.length, 32);
  for (const route of routes) {
    assert.ok(route.title && route.summary);
    assert.ok(["kural", "akylbek", "koishyman"].includes(route.owner));
    assert.match(route.path, /^\/(?:[a-z-]+(?:\/[a-z-]+)*)?$/);
  }
});

test("основное меню ведёт в рабочие разделы и на один экран геймификации", () => {
  const ids = [...workspacePrimaryRoutes, ...catalogRoutes];
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(siteRoutes[id] && !Object.hasOwn(redirectRoutes, id), id);
  assert.deepEqual(workspacePrimaryRoutes, ["dashboard", "profile", "setup", "subjects", "gamification"]);
  assert.deepEqual(redirectRoutes, {
    home: "login", competitions: "gamification", challenge: "gamification", achievements: "gamification", leaderboard: "gamification",
  });
});

test("архив доступен всем, каталог модератору и админу, назначение ролей админу", () => {
  for (const role of ["student", "moderator", "admin"]) {
    for (const id of [...workspacePrimaryRoutes, "history"]) assert.equal(canOpenWorkspaceRoute(siteRoutes[id].path, role), true, `${role} ${id}`);
    for (const id of ["management", "universities", "programs", "groups", "semesters", "studyPlans", "moderation", "competitionManagement"]) {
      assert.equal(canOpenWorkspaceRoute(siteRoutes[id].path, role), role !== "student", `${role} ${id}`);
    }
    assert.equal(canOpenWorkspaceRoute(siteRoutes.users.path, role), role === "admin", role);
  }
});

test("этапы README сохранены: предварительный экран геймификации остаётся после чатов", () => {
  const afterMvp = ["progress", "goals", "simulator", "chats", "groupChat", "subjectChat", "moderation"];
  const afterChats = ["gamification", "competitions", "challenge", "achievements", "leaderboard", "competitionManagement"];
  for (const [id, route] of Object.entries(siteRoutes)) {
    const phase = afterMvp.includes(id) ? "after-mvp" : afterChats.includes(id) ? "after-chats" : "mvp";
    assert.equal(route.phase, phase, id);
  }
});

const base = process.env.SCHOLARPATH_CHECK_URL;
test("HTTP: 27 экранов, 5 перенаправлений, рабочие ссылки аккаунта и 404", { skip: !base }, async () => {
  const known = new Set(routes.map((route) => route.path));
  const linksByPage = new Map();
  await Promise.all(Object.entries(siteRoutes).map(async ([id, route]) => {
    const response = await fetch(new URL(route.path, base), { redirect: "manual" });
    const target = redirectRoutes[id];
    if (target) {
      assert.equal(response.status, 307, route.path);
      assert.equal(new URL(response.headers.get("location"), base).pathname, siteRoutes[target].path, route.path);
      return;
    }
    assert.equal(response.status, 200, route.path);
    const html = await response.text();
    const links = new Set();
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      if (!match[1].startsWith("/") || match[1].startsWith("//")) continue;
      const path = new URL(match[1].replaceAll("&amp;", "&"), base).pathname;
      assert.ok(known.has(path), route.path + " → неизвестная ссылка " + path);
      links.add(path);
    }
    linksByPage.set(id, links);
  }));
  const accountTransitions = [
    ["login", "register"], ["register", "verifyEmail"], ["verifyEmail", "login"],
    ["login", "forgotPassword"], ["forgotPassword", "resetPassword"], ["resetPassword", "login"],
  ];
  for (const [from, to] of accountTransitions) {
    assert.ok(linksByPage.get(from).has(siteRoutes[to].path), from + " → " + to);
  }
  const missing = await fetch(new URL("/page-that-does-not-exist", base));
  assert.equal(missing.status, 404);
});
