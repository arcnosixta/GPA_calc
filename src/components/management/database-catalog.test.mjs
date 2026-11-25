import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const ok = (data) => ({ data, error: null });
const duplicate = { data: null, error: { code: "23505" } };

function fixture(responses = []) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ok({ user: { id: "moderator" } }) },
    from(table) {
      const call = { table, steps: [] }; calls.push(call);
      const builder = {};
      for (const name of ["select", "insert", "update", "eq", "is", "order", "range", "single"]) {
        builder[name] = (...args) => { call.steps.push([name, ...args]); return builder; };
      }
      builder.then = (success, failure) => {
        assert.ok(responses.length, `Unexpected query: ${table}`);
        return Promise.resolve(responses.shift()).then(success, failure);
      };
      return builder;
    },
  };
  const modules = new Map();
  function load(path) {
    if (modules.has(path)) return modules.get(path).exports;
    const loadedModule = { exports: {} }; modules.set(path, loadedModule);
    const source = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    const require = (specifier) => {
      if (specifier === "@/lib/supabase/client") return { createBrowserSupabaseClient: () => client };
      const base = specifier.startsWith("@/") ? resolve(root, "src", specifier.slice(2)) : resolve(dirname(path), specifier);
      const filename = [base + ".ts", base + ".tsx"].find(existsSync);
      assert.ok(filename, specifier); return load(filename);
    };
    new Script(`(function(require,module,exports){${source}\n})`, { filename: path }).runInThisContext()(require, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return { calls, client, catalog: load(resolve(root, "src/lib/data/catalog.ts")) };
}

test("moderator scope accounts for foreign groups and shared subject plans", () => {
  const { catalog } = fixture();
  const account = { user: { id: "moderator" }, role: "moderator" };
  const data = {
    universities: [{ id: "u", created_by: null }, { id: "own", created_by: "moderator" }],
    programs: [{ id: "p", university_id: "u" }, { id: "p2", university_id: "own" }],
    groups: [{ id: "assigned", program_id: "p" }, { id: "foreign", program_id: "p" }],
    assignments: [{ moderator_id: "moderator", group_id: "assigned" }],
    subjects: [{ id: "shared", program_id: "p" }, { id: "own-subject", program_id: "p" }],
    plans: [{ group_id: "foreign", subject_id: "shared", semester: 1 }], semesters: [],
  };
  assert.equal(catalog.canManageGroup(account, data, "foreign"), false);
  assert.equal(catalog.canManageUniversity(account, data, "u"), true);
  assert.equal(catalog.canUseProgram(account, data, "p"), true);
  assert.equal(catalog.canManageProgram(account, data, "p"), false);
  assert.equal(catalog.canManageSubject(account, data, "shared"), false);
  assert.equal(catalog.canManageSubject(account, data, "own-subject"), true);
  assert.equal(catalog.canUseProgram(account, data, "p2"), true);
  assert.equal(catalog.canManageProgram(account, data, "p2"), true);
  assert.equal(catalog.canManageSubject({ ...account, role: "student" }, data, "own-subject"), false);
  assert.equal(catalog.canManageSubject({ ...account, role: "admin" }, data, "shared"), true);
});

test("subject retry returns a confirmed matching row after a unique-code conflict", async () => {
  const saved = { id: "id", program_id: "p", code: "CS_10%", title: "Программирование", credits: 3, archived_at: null };
  const { catalog, calls } = fixture([duplicate, ok([saved])]);
  assert.deepEqual(await catalog.createSubject("p", { code: "cs_10%", title: " Программирование ", credits: 3 }), saved);
  assert.deepEqual(calls[0].steps[0], ["insert", { program_id: "p", code: "cs_10%", title: "Программирование", credits: 3 }]);
  assert.equal(calls.some((call) => call.steps.some((step) => step[0] === "update")), false);
  await assert.rejects(fixture([duplicate, ok([{ ...saved, credits: 7 }])]).catalog.createSubject("p", { code: "CS_10%", title: "Программирование", credits: 3 }), { code: "23505" });
});

test("an empty UPDATE response and RLS denial never report success", async () => {
  await assert.rejects(fixture([ok(null)]).catalog.saveSubject("id", { code: "C", title: "Предмет", credits: 3 }), { code: "PGRST116" });
  await assert.rejects(fixture([{ data: null, error: { code: "42501" } }]).catalog.archiveSubject("id"), { code: "42501" });
});

test("subject edits whitelist writable columns and archiving never changes personal results", async () => {
  const { catalog, calls } = fixture([ok({ id: "id" }), ok({ id: "id", archived_at: "date" })]);
  await catalog.saveSubject("id", { code: " C ", title: " Предмет ", credits: 3, program_id: "foreign", student_id: "other" });
  assert.deepEqual(calls[0].steps[0], ["update", { code: "C", title: "Предмет", credits: 3 }]);
  await catalog.archiveSubject("id");
  assert.deepEqual(Object.keys(calls[1].steps[0][1]), ["archived_at"]);
  assert.deepEqual(calls.map((item) => item.table), ["subjects", "subjects"]);
});

test("invalid credits, empty new codes and fractional group years fail before a request", async () => {
  const { catalog, calls } = fixture();
  await assert.rejects(catalog.createSubject("p", { code: "C", title: "Предмет", credits: 1.5 }));
  await assert.rejects(catalog.createSubject("p", { code: "", title: "Предмет", credits: 3 }));
  await assert.rejects(catalog.createGroup("p", "Группа", 1.5));
  await assert.rejects(catalog.saveSemester(9, { title: "Семестр", is_active: true }));
  assert.equal(calls.length, 0);
});

test("directory retry reads the unique row and cannot silently change its parent or year", async () => {
  const saved = { id: "u", name: "Вуз", created_by: "moderator" };
  const { catalog, calls } = fixture([duplicate, ok(saved)]);
  assert.deepEqual(await catalog.createUniversity("Вуз"), saved);
  assert.deepEqual(calls[1].steps, [["select", "*"], ["eq", "name", "Вуз"], ["single"]]);
  await assert.rejects(fixture([duplicate, ok({ ...saved, created_by: "someone-else" })]).catalog.createUniversity("Вуз"), { code: "23505" });
  await assert.rejects(fixture([duplicate, ok({ id: "g", program_id: "p", name: "Группа", year: 2 })]).catalog.createGroup("p", "Группа", 1), { code: "23505" });
});

test("missing Auth prevents catalog writes and catalog reads do not fetch private scores", async () => {
  const signedOut = fixture();
  signedOut.client.auth.getUser = async () => ok({ user: null });
  await assert.rejects(signedOut.catalog.createUniversity("Вуз"), /Сеанс/);
  assert.equal(signedOut.calls.length, 0);
  const { catalog, calls } = fixture(Array.from({ length: 7 }, () => ok([])));
  await catalog.readCatalog();
  assert.deepEqual(calls.map((item) => item.table), ["universities", "programs", "study_groups", "subjects", "semesters", "study_plan_items", "moderator_groups"]);
});

test("errors distinguish conflict, missing row, foreign key and network", () => {
  const { catalog } = fixture();
  assert.match(catalog.managementErrorMessage({ code: "23505" }), /существуют/);
  assert.match(catalog.managementErrorMessage({ code: "23503" }), /Связанная/);
  assert.match(catalog.managementErrorMessage({ code: "PGRST116" }), /не найдена/);
  assert.match(catalog.managementErrorMessage({ code: "42501" }), /прав/);
  assert.match(catalog.managementErrorMessage({ code: "NETWORK" }), /соединения/);
});

test("catalog reads subsequent pages instead of silently losing foreign-group links", async () => {
  const first = Array.from({ length: 200 }, (_, index) => ({ id: `u-${index}` }));
  const { catalog, calls } = fixture([ok(first), ...Array.from({ length: 6 }, () => ok([])), ok([{ id: "last-university" }])]);
  const data = await catalog.readCatalog();
  assert.equal(data.universities.length, 201);
  assert.equal(data.universities[200].id, "last-university");
  assert.deepEqual(calls[7].steps.at(-1), ["range", 200, 399]);
});
