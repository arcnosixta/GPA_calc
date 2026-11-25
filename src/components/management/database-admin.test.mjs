import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const ok = (data) => ({ data, error: null });

function fixture(responses = [], roles = ["admin"], status = 200) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ok({ user: { id: "signed-in-user" } }) },
    from(table) { return query({ table, steps: [] }); },
    rpc(name, args) { return query({ rpc: name, args, steps: [] }); },
  };
  function query(call) {
    calls.push(call);
    const builder = {};
    for (const method of ["select", "insert", "update", "delete", "eq", "order", "range", "single", "maybeSingle"]) {
      builder[method] = (...args) => { call.steps.push([method, ...args]); return builder; };
    }
    builder.then = (success, failure) => {
      if (typeof responses === "function") return Promise.resolve(responses(call)).then(success, failure);
      assert.ok(responses.length, `Unexpected query: ${JSON.stringify(call)}`);
      return Promise.resolve(responses.shift()).then(success, failure);
    };
    return builder;
  }
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const loadedModule = { exports: {} }; cache.set(path, loadedModule);
    const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    function require(specifier) {
      if (specifier === "@/lib/supabase/client") return { createBrowserSupabaseClient: () => client };
      const base = specifier.startsWith("@/") ? resolve(root, "src", specifier.slice(2)) : resolve(dirname(path), specifier);
      return load(`${base}.ts`);
    }
    const fetch = async () => ({ status, ok: status === 200, json: async () => ({ user: { id: "signed-in-user" }, role: roles.length > 1 ? roles.shift() : roles[0] }) });
    new Script(`(function(require,module,exports,fetch){${code}\n})`, { filename: path }).runInThisContext()(require, loadedModule, loadedModule.exports, fetch);
    return loadedModule.exports;
  }
  return { repo: load(resolve(root, "src/lib/data/admin.ts")), calls, client };
}

test("student and moderator cannot start an administrator query", async () => {
  for (const role of ["student", "moderator"]) {
    const { repo, calls } = fixture([], [role]);
    await assert.rejects(repo.setUserRole("other", "moderator"), { code: "42501" });
    await assert.rejects(repo.readAdminData(), { code: "42501" });
    assert.equal(calls.length, 0);
  }
});

test("expired account and unavailable account endpoint are not treated as empty users", async () => {
  await assert.rejects(fixture([], [], 401).repo.readAdminData(), /Сеанс/);
  await assert.rejects(fixture([], [], 503).repo.readAdminData(), /unavailable/);
});

test("roles use only protected RPC and are reread before success", async () => {
  const saved = { user_id: "target", role: "moderator" };
  const { repo, calls } = fixture([ok({ user_id: "target", role: "student" }), ok(null), ok(saved)]);
  assert.deepEqual(await repo.setUserRole("target", "moderator"), saved);
  assert.deepEqual(calls[1], { rpc: "admin_set_user_role", args: { target_user_id: "target", new_role: "moderator" }, steps: [] });
  assert.deepEqual(calls[2].steps, [["select", "*"], ["eq", "user_id", "target"], ["single"]]);
  assert.ok(calls.every((call) => !call.steps.some(([method]) => method === "update")));
});

test("own role and existing administrator are not edited", async () => {
  const own = fixture();
  await assert.rejects(own.repo.setUserRole("signed-in-user", "student"), /собственную/);
  assert.equal(own.calls.length, 0);
  const other = fixture([ok({ user_id: "target", role: "admin" })]);
  await assert.rejects(other.repo.setUserRole("target", "student"), /администратора/);
  assert.ok(other.calls.every((call) => !call.rpc));
});

test("RPC denial and different readback cannot report success", async () => {
  const current = { user_id: "target", role: "student" };
  await assert.rejects(fixture([ok(current), { error: { code: "42501" } }]).repo.setUserRole("target", "moderator"), { code: "42501" });
  await assert.rejects(fixture([ok(current), ok(null), ok(current)]).repo.setUserRole("target", "moderator"), /другим запросом/);
  await assert.rejects(fixture([ok(current), ok(null), { error: { code: "PGRST116" } }]).repo.setUserRole("target", "moderator"), { code: "PGRST116" });
});

test("repeated group assignment returns same relation and never changes generated role", async () => {
  const saved = { moderator_id: "moderator", group_id: "group", moderator_role: "moderator" };
  const { repo, calls } = fixture([ok({ role: "moderator" }), { error: { code: "23505" } }, ok(saved)]);
  assert.deepEqual(await repo.addModeratorGroup("moderator", "group"), saved);
  assert.deepEqual(calls[1].steps[0], ["insert", { moderator_id: "moderator", group_id: "group" }]);
  assert.ok(calls[2].steps.some((step) => step[0] === "eq" && step[1] === "moderator_id" && step[2] === "moderator"));
  assert.ok(calls[2].steps.some((step) => step[0] === "eq" && step[1] === "group_id" && step[2] === "group"));
});

test("student cannot receive moderator assignment", async () => {
  const { repo, calls } = fixture([ok({ role: "student" })]);
  await assert.rejects(repo.addModeratorGroup("student", "group"), /роль модератора/);
  assert.equal(calls.length, 1);
});

test("empty delete succeeds only after renewed admin check and confirmed absence", async () => {
  const successful = fixture([ok([]), ok(null)]);
  await successful.repo.removeModeratorGroup("moderator", "group");
  assert.equal(successful.calls.length, 2);
  assert.ok(successful.calls[1].steps.some((step) => step[0] === "maybeSingle"));
  await assert.rejects(fixture([ok([]), ok({ moderator_id: "moderator", group_id: "group" })]).repo.removeModeratorGroup("moderator", "group"), /осталось/);
  const demoted = fixture([ok([])], ["admin", "student"]);
  await assert.rejects(demoted.repo.removeModeratorGroup("moderator", "group"), { code: "42501" });
  assert.equal(demoted.calls.length, 1);
});

test("archive always filters authenticated owner and keeps stored credits and grades", async () => {
  const saved = [{ id: "row", student_id: "signed-in-user", title: "Старое название", credits: 3, grade: "FX", grade_points: 0.5 }];
  const { repo, calls } = fixture([ok(saved)]);
  assert.deepEqual(await repo.readOwnHistory("signed-in-user"), saved);
  assert.equal(calls[0].table, "student_results");
  assert.ok(calls[0].steps.some((step) => step[0] === "eq" && step[1] === "student_id" && step[2] === "signed-in-user"));
});

test("changed account cannot retrieve stale account's archive", async () => {
  const { repo, calls } = fixture();
  await assert.rejects(repo.readOwnHistory("previous-user"), /Сеанс/);
  assert.equal(calls.length, 0);
});

test("administrator lists include all pages with stable primary-key tie breakers", async () => {
  const tables = {
    profiles: Array.from({ length: 201 }, (_, index) => ({ id: `user-${index}`, first_name: "Same", last_name: "Name" })),
    user_roles: Array.from({ length: 201 }, (_, index) => ({ user_id: `user-${index}`, role: "moderator" })),
    moderator_groups: Array.from({ length: 201 }, (_, index) => ({ moderator_id: `user-${index}`, group_id: "group" })),
    study_groups: Array.from({ length: 201 }, (_, index) => ({ id: `group-${index}`, name: "Same" })),
  };
  const { repo, calls } = fixture((call) => {
    const [, start, end] = call.steps.find(([method]) => method === "range");
    return ok(tables[call.table].slice(start, end + 1));
  });
  const result = await repo.readAdminData();
  assert.deepEqual(result, { profiles: tables.profiles, roles: tables.user_roles, assignments: tables.moderator_groups, groups: tables.study_groups });
  for (const [table, keys] of Object.entries({ profiles: ["last_name", "first_name", "id"], user_roles: ["user_id"], moderator_groups: ["moderator_id", "group_id"], study_groups: ["name", "id"] })) {
    const pages = calls.filter((call) => call.table === table);
    assert.deepEqual(pages.map((call) => call.steps.find(([method]) => method === "range")), [["range", 0, 199], ["range", 200, 399]]);
    assert.ok(pages.every((call) => JSON.stringify(call.steps.filter(([method]) => method === "order").map((step) => step[1])) === JSON.stringify(keys)));
  }
});

test("archive beyond API row limit retains every owned historical snapshot", async () => {
  const snapshots = Array.from({ length: 1001 }, (_, index) => ({ id: `row-${index}`, student_id: "signed-in-user", academic_year: "2025-2026", semester: 1, title: "Сохранённое название", credits: 3, grade: "B" }));
  const { repo, calls } = fixture((call) => {
    const [, start, end] = call.steps.find(([method]) => method === "range");
    return ok(snapshots.slice(start, end + 1));
  });
  assert.deepEqual(await repo.readOwnHistory("signed-in-user"), snapshots);
  assert.equal(calls.length, 6);
  for (const call of calls) {
    assert.equal(call.table, "student_results");
    assert.ok(call.steps.some((step) => step[0] === "eq" && step[1] === "student_id" && step[2] === "signed-in-user"));
    assert.deepEqual(call.steps.filter(([method]) => method === "order").map((step) => step[1]), ["academic_year", "semester", "title", "id"]);
  }
  assert.deepEqual(calls.at(-1).steps.find(([method]) => method === "range"), ["range", 1000, 1199]);
});

test("failed later archive page cannot display a partial archive as complete", async () => {
  const first = Array.from({ length: 200 }, (_, index) => ({ id: `row-${index}` }));
  const { repo } = fixture([ok(first), { data: null, error: { code: "NETWORK" } }]);
  await assert.rejects(repo.readOwnHistory("signed-in-user"), { code: "NETWORK" });
  await assert.rejects(fixture([ok(null)]).repo.readOwnHistory("signed-in-user"), { code: "PGRST116" });
});

test("missing or mismatched role and assignment readbacks cannot confirm writes", async () => {
  const current = { user_id: "target", role: "student" };
  await assert.rejects(fixture([ok(null)]).repo.setUserRole("target", "moderator"), { code: "PGRST116" });
  await assert.rejects(fixture([ok(current), ok(null), ok(null)]).repo.setUserRole("target", "moderator"), { code: "PGRST116" });
  await assert.rejects(fixture([ok(current), ok(null), ok({ user_id: "other", role: "moderator" })]).repo.setUserRole("target", "moderator"), /не подтверждено/);
  await assert.rejects(fixture([ok({ role: "moderator" }), ok(null)]).repo.addModeratorGroup("moderator", "group"), { code: "PGRST116" });
  await assert.rejects(fixture([ok({ role: "moderator" }), ok({ moderator_id: "other", group_id: "group" })]).repo.addModeratorGroup("moderator", "group"), /не подтверждено/);
  await assert.rejects(fixture([ok({ role: "moderator" }), { error: { code: "23505" } }, ok({ moderator_id: "moderator", group_id: "other" })]).repo.addModeratorGroup("moderator", "group"), /не подтверждено/);
});
