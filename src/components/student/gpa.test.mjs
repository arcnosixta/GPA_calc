import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./integration-adapter.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { calculateGpa, calculateGpaHistory } =
  await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));

test("взвешенный GPA: A/3, B/2, без оценки/3 — 3.60", () => {
  assert.equal(calculateGpa([{ credits: 3, grade: "A" }, { credits: 2, grade: "B" }, { credits: 3, grade: null }]), 3.6);
});
test("F участвует в знаменателе; отсутствие оценок возвращает null", () => {
  assert.equal(calculateGpa([{ credits: 3, grade: "A" }, { credits: 3, grade: "F" }]), 2);
  assert.equal(calculateGpa([{ credits: 5, grade: "F" }]), 0);
  assert.equal(calculateGpa([]), null);
  assert.equal(calculateGpa([{ credits: 3, grade: null }]), null);
});
test("расчёт не округляет результат и сохраняет исходные оценки", () => {
  const subjects = Object.freeze([Object.freeze({ credits: 2, grade: "A−" }), Object.freeze({ credits: 1, grade: "B+" })]);
  assert.equal(calculateGpa(subjects), (2 * 3.67 + 3.33) / 3);
  assert.equal(subjects[0].grade, "A−");
});

test("F на 3 кредита и B на 2 дают 1.20, а FX даёт 0.50 балла на кредит", () => {
  const gradedB = { credits: 2, grade: "B" };
  assert.equal(calculateGpa([{ credits: 3, grade: "F" }, gradedB]), 1.2);
  assert.equal(calculateGpa([{ credits: 3, grade: "FX" }, gradedB]), 1.5);
});

test("GPA семестра и всего плана учитывает кредиты без промежуточного округления", () => {
  const subjects = [
    { semester: 3, credits: 3, grade: "A" },
    { semester: 3, credits: 2, grade: "B" },
    { semester: 4, credits: 2, grade: "C+" },
    { semester: 4, credits: 1, grade: "B+" },
    { semester: 5, credits: 30, grade: null },
  ];
  const semesterGpa = (semester) => calculateGpa(subjects.filter((subject) => subject.semester === semester));

  assert.equal(semesterGpa(3), 3.6);
  assert.ok(Math.abs(semesterGpa(4) - 7.99 / 3) < 1e-12);
  assert.equal(semesterGpa(5), null);
  assert.equal(semesterGpa(6), null);
  assert.ok(Math.abs(calculateGpa(subjects) - 25.99 / 8) < 1e-12);
});

test("история GPA сортирует семестры и накапливает оценки с учётом кредитов", () => {
  const subjects = [
    { semester: 4, credits: 4, grade: "F" },
    { semester: 3, credits: 2, grade: "A" },
    { semester: 5, credits: 5, grade: null },
    { semester: 2, credits: 6, grade: null },
    { semester: 3, credits: 1, grade: "B" },
    { semester: 4, credits: 30, grade: null },
  ];

  assert.deepEqual(calculateGpaHistory(subjects), [
    { semester: 2, semesterGpa: null, cumulativeGpa: null },
    { semester: 3, semesterGpa: 11 / 3, cumulativeGpa: 11 / 3 },
    { semester: 4, semesterGpa: 0, cumulativeGpa: 11 / 7 },
    { semester: 5, semesterGpa: null, cumulativeGpa: 11 / 7 },
  ]);
});

test("история GPA различает пустой план и семестр с оценкой F", () => {
  assert.deepEqual(calculateGpaHistory([]), []);
  assert.deepEqual(calculateGpaHistory([{ semester: 1, credits: 3, grade: "F" }]), [
    { semester: 1, semesterGpa: 0, cumulativeGpa: 0 },
  ]);
});
