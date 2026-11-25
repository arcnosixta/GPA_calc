import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const ok = (data) => ({ data, error: null });
const original = { id: "term", calendar_id: "calendar", season: "autumn", period: { kind: "weeks", start: 1, end: 15 }, rk1: { kind: "weeks", start: 7, end: 7 }, rk2: { kind: "weeks", start: 14, end: 14 } };

function fixture(responses = []) {
  const calls = [], cache = new Map();
  const client = {
    auth: { getUser: async () => ok({ user: { id: "verified-user" } }) },
    from(table) {
      const call = { table, steps: [] }; calls.push(call);
      const builder = {};
      for (const name of ["select", "update", "eq", "in", "single"]) builder[name] = (...args) => { call.steps.push([name, ...args]); return builder; };
      builder.then = (success, failure) => {
        assert.ok(responses.length, `Unexpected request to ${table}`);
        return Promise.resolve(responses.shift()).then(success, failure);
      };
      return builder;
    },
  };
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const loadedModule = { exports: {} }; cache.set(path, loadedModule);
    const source = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    function require(specifier) {
      if (specifier === "@/lib/supabase/client") return { createBrowserSupabaseClient: () => client };
      const base = specifier.startsWith("@/") ? resolve(root, "src", specifier.slice(2)) : resolve(dirname(path), specifier);
      const filename = [base + ".ts", base + ".tsx"].find(existsSync);
      assert.ok(filename, specifier); return load(filename);
    }
    new Script(`(function(require,module,exports){${source}\n})`, { filename: path }).runInThisContext()(require, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return { calls, client, calendars: load(resolve(root, "src/lib/data/calendars.ts")), student: load(resolve(root, "src/lib/data/student.ts")) };
}

test("management and student calendar use the same read function and scope", async () => {
  const saved = { id: "calendar", university_id: "esil", academic_year: "2026-2027" };
  const { calendars, student, calls } = fixture([ok([saved]), ok([original]), ok([{ id: "source" }])]);
  assert.equal(calendars.readCalendars, student.readCalendars);
  assert.deepEqual((await calendars.readCalendars("esil", "2026-2027")).calendars, [saved]);
  assert.ok(calls[0].steps.some((step) => step[0] === "eq" && step[1] === "university_id" && step[2] === "esil"));
  assert.ok(calls[0].steps.some((step) => step[0] === "eq" && step[1] === "academic_year" && step[2] === "2026-2027"));
});

test("period and both checkpoints save in one request; keys and season are immutable", async () => {
  const changed = { ...original, rk1: { kind: "weeks", start: 7, end: 8 } };
  const { calendars, calls } = fixture([ok(changed)]);
  const result = await calendars.saveCalendarTerm(original, "2026-2027", { ...changed, id: "foreign-term", season: "spring" });
  assert.deepEqual(result, changed);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].steps[0], ["update", { period: original.period, rk1: changed.rk1, rk2: original.rk2 }]);
  assert.ok(calls[0].steps.some((step) => step[0] === "eq" && step[1] === "id" && step[2] === original.id));
  assert.ok(calls[0].steps.some((step) => step[0] === "eq" && step[1] === "calendar_id" && step[2] === original.calendar_id));
});

test("invalid or out-of-year calendar values fail before database writes", async () => {
  const { calendars, calls } = fixture();
  await assert.rejects(calendars.saveCalendarTerm(original, "2026-2027", { ...original, rk1: { kind: "weeks", start: 0, end: 7 } }));
  await assert.rejects(calendars.saveCalendarTerm(original, "2026-2027", { ...original, rk1: { kind: "weeks", start: 7, end: 14 } }));
  await assert.rejects(calendars.saveCalendarTerm(original, "2026-2027", { ...original, rk1: { kind: "dates", start: "2028-01-01", end: "2028-01-02" } }));
  await assert.rejects(calendars.saveCalendarTerm(original, "2026-2027", { ...original, rk1: { kind: "dates", start: "2027-02-29", end: "2027-02-29" } }));
  assert.equal(calls.length, 0);
});

test("RLS rejection, zero rows and wrong returned ID cannot confirm saving", async () => {
  await assert.rejects(fixture([{ data: null, error: { code: "42501" } }]).calendars.saveCalendarTerm(original, "2026-2027", original), { code: "42501" });
  await assert.rejects(fixture([ok(null)]).calendars.saveCalendarTerm(original, "2026-2027", original), /не подтверждено/);
  await assert.rejects(fixture([ok({ ...original, id: "another" })]).calendars.saveCalendarTerm(original, "2026-2027", original), /не подтверждено/);
});

test("repeated save changes one existing row and never inserts another term", async () => {
  const { calendars, calls } = fixture([ok(original), ok(original)]);
  await calendars.saveCalendarTerm(original, "2026-2027", original);
  await calendars.saveCalendarTerm(original, "2026-2027", original);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.table === "calendar_terms" && call.steps[0][0] === "update"));
});

test("calendar metadata saves separately without moving university or academic year", async () => {
  const fields = { scope: " Bachelor ", status: "official", source_id: "source" };
  const { calendars, calls } = fixture([ok({ id: "calendar", ...fields })]);
  await calendars.saveCalendarMetadata("calendar", fields);
  assert.deepEqual(calls[0].steps[0], ["update", { scope: "Bachelor", status: "official", source_id: "source" }]);
  const invalid = fixture();
  await assert.rejects(invalid.calendars.saveCalendarMetadata("calendar", { ...fields, source_id: null }), /источник/);
  assert.equal(invalid.calls.length, 0);
});

test("source keeps parent IDs and rejects insecure URL and impossible date", async () => {
  const fields = { title: " Calendar ", scope: " Bachelor ", url: "https://example.edu/calendar.pdf", checked_at: "2026-11-25", note: " Checked " };
  const { calendars, calls } = fixture([ok({ id: "source", ...fields })]);
  await calendars.saveCalendarSource("source", fields);
  assert.deepEqual(calls[0].steps[0], ["update", { ...fields, title: "Calendar", scope: "Bachelor", note: "Checked" }]);
  const invalid = fixture();
  await assert.rejects(invalid.calendars.saveCalendarSource("source", { ...fields, url: "javascript:alert(1)" }), /HTTPS/);
  await assert.rejects(invalid.calendars.saveCalendarSource("source", { ...fields, checked_at: "2026-02-30" }), /дату/);
  assert.equal(invalid.calls.length, 0);
});

test("missing auth session prevents calendar updates", async () => {
  const { calendars, client, calls } = fixture();
  client.auth.getUser = async () => ok({ user: null });
  await assert.rejects(calendars.saveCalendarTerm(original, "2026-2027", original), /Сеанс/);
  assert.equal(calls.length, 0);
});
