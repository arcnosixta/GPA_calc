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

function fixture(responses = [], accountStatus = 200) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ok({ user: { id: "verified-user" } }) },
    from(table) {
      const call = { table, steps: [] }; calls.push(call);
      const builder = {};
      for (const name of ["select", "insert", "update", "delete", "eq", "is", "in", "order", "single"]) {
        builder[name] = (...args) => { call.steps.push([name, ...args]); return builder; };
      }
      builder.then = (success, failure) => {
        assert.ok(responses.length, `Unexpected request to ${table}`);
        return Promise.resolve(responses.shift()).then(success, failure);
      };
      return builder;
    },
  };
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const loadedModule = { exports: {} }; cache.set(path, loadedModule);
    const source = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    const require = (specifier) => {
      if (specifier === "@/lib/supabase/client") return { createBrowserSupabaseClient: () => client };
      const base = specifier.startsWith("@/") ? resolve(root, "src", specifier.slice(2)) : resolve(dirname(path), specifier);
      const filename = [base + ".ts", base + ".tsx"].find(existsSync);
      assert.ok(filename, specifier); return load(filename);
    };
    const fetch = async () => ({ status: accountStatus, ok: accountStatus === 200, json: async () => ({ user: { id: "verified-user" } }) });
    new Script(`(function(require,module,exports,fetch){${source}\n})`, { filename: path }).runInThisContext()(require, loadedModule, loadedModule.exports, fetch);
    return loadedModule.exports;
  }
  return { calls, client, student: load(resolve(root, "src/lib/data/student.ts")), profile: load(resolve(root, "src/lib/data/profile.ts")) };
}

test("401 is signed out; 503 remains a connection error", async () => {
  assert.equal(await fixture([], 401).profile.readAccount(), null);
  await assert.rejects(fixture([], 503).profile.readAccount(), /unavailable/);
});

test("duplicate add returns owned row and never sends owner or snapshot columns", async () => {
  const row = { id: "personal-row", credits: 3, title: "Historical title" };
  const { student, calls } = fixture([duplicate, ok(row)]);
  assert.deepEqual(await student.addSubject("catalog-id", "2026-2027", 3), row);
  assert.deepEqual(calls[0].steps[0], ["insert", { subject_id: "catalog-id", academic_year: "2026-2027", semester: 3 }]);
  assert.ok(calls[1].steps.some((step) => step[0] === "eq" && step[1] === "student_id" && step[2] === "verified-user"));
});

test("assessment retry updates only scores, preserves null and zero, rereads SQL result", async () => {
  const saved = { id: "personal-row", rk1: 0, rk2: null, exam: 100, grade: null };
  const { student, calls } = fixture([duplicate, ok({ student_subject_id: "personal-row" }), ok(saved)]);
  assert.deepEqual(await student.saveAssessment("personal-row", { rk1: 0, rk2: null, exam: 100 }), saved);
  assert.deepEqual(calls[1].steps[0], ["update", { rk1: 0, rk2: null, exam: 100 }]);
  assert.equal(calls[2].table, "student_results");
});

test("RLS denial and unavailable readback cannot report a successful save", async () => {
  const denied = { error: { code: "42501" }, data: null };
  await assert.rejects(fixture([denied]).student.saveAssessment("other-user-row", { rk1: 1, rk2: 2, exam: 3 }), { code: "42501" });
  await assert.rejects(fixture([ok(null), { error: { code: "NETWORK" } }]).student.saveAssessment("row", { rk1: 1, rk2: 2, exam: 3 }), { code: "NETWORK" });
});

test("forecast updates never touch assessments or student snapshots", async () => {
  const { student, calls } = fixture([duplicate, ok({ student_subject_id: "row", grade: "A" })]);
  await student.saveForecast("row", "A");
  assert.deepEqual(calls.map((call) => call.table), ["grade_forecasts", "grade_forecasts"]);
  assert.deepEqual(calls[1].steps[0], ["update", { grade: "A" }]);
});

test("invalid scores and academic year fail before making database requests", async () => {
  const { student, calls } = fixture();
  await assert.rejects(student.addSubject("subject", "2026-2028", 1));
  await assert.rejects(student.saveAssessment("row", { rk1: -1, rk2: null, exam: 0 }));
  assert.equal(calls.length, 0);
});

test("group from another university cannot be saved", async () => {
  const { profile, calls } = fixture([ok([{ id: "university" }]), ok([{ id: "program", university_id: "university" }]), ok([{ id: "group", program_id: "program" }])]);
  await assert.rejects(profile.saveProfile("First", "Last", "another-university", "group"), /Группа/);
  assert.ok(calls.every((call) => call.table !== "profiles"));
});

test("profile saves only the verified auth user's editable fields", async () => {
  const saved = { id: "verified-user", first_name: "First", last_name: "Last", group_id: "group" };
  const { profile, calls } = fixture([ok([{ id: "university" }]), ok([{ id: "program", university_id: "university" }]), ok([{ id: "group", program_id: "program" }]), ok(saved)]);
  assert.deepEqual(await profile.saveProfile(" First ", " Last ", "university", "group"), saved);
  assert.deepEqual(calls[3].steps[0], ["update", { first_name: "First", last_name: "Last", group_id: "group" }]);
  assert.deepEqual(calls[3].steps[1], ["eq", "id", "verified-user"]);
});

test("missing auth user prevents personal writes", async () => {
  const { student, client, calls } = fixture();
  client.auth.getUser = async () => ok({ user: null });
  await assert.rejects(student.addSubject("subject", "2026-2027", 1), /Сеанс/);
  assert.equal(calls.length, 0);
});
