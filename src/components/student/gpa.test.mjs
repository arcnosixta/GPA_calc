import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

// Выполняем временный адаптер без загрузки клиентского каталога.
const source = readFileSync(new URL("./integration-adapter.ts", import.meta.url), "utf8")
  .replace(/^import .*;$/gm, "")
  .replace(/^const catalog = .*;$/m, "const catalog = {};");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { calculateGpa, gradePoints } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));

test("взвешенный GPA: A/3, B/2, без оценки/3 — 3.60", () => {
  assert.equal(calculateGpa([{ credits: 3, grade: "A" }, { credits: 2, grade: "B" }, { credits: 3, grade: null }]), 3.6);
});
test("F участвует в знаменателе; отсутствие оценок возвращает null", () => {
  assert.equal(calculateGpa([{ credits: 3, grade: "A" }, { credits: 3, grade: "F" }]), 2);
  assert.equal(calculateGpa([{ credits: 5, grade: "F" }]), 0);
  assert.equal(calculateGpa([]), null);
  assert.equal(calculateGpa([{ credits: 3, grade: null }]), null);
});
test("шкала README, точность и неизменность исходных данных", () => {
  assert.equal(gradePoints["A−"], 3.7);
  assert.equal(gradePoints["B+"], 3.3);
  const subjects = Object.freeze([Object.freeze({ credits: 2, grade: "A−" }), Object.freeze({ credits: 1, grade: "B+" })]);
  assert.equal(calculateGpa(subjects), (2 * 3.7 + 3.3) / 3);
  assert.equal(subjects[0].grade, "A−");
});
