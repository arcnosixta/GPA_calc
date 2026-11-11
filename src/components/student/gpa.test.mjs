import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./integration-adapter.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { calculateGpa, earnsCredits, gradeFromScore, gradePoints } =
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
test("шкала README, точность и неизменность исходных данных", () => {
  assert.equal(gradePoints["A−"], 3.67);
  assert.equal(gradePoints["B+"], 3.33);
  const subjects = Object.freeze([Object.freeze({ credits: 2, grade: "A−" }), Object.freeze({ credits: 1, grade: "B+" })]);
  assert.equal(calculateGpa(subjects), (2 * 3.67 + 3.33) / 3);
  assert.equal(subjects[0].grade, "A−");
});

test("итоговые баллы переводятся в буквы на границах общей шкалы", () => {
  const bands = [
    ["A", 95, 100], ["A−", 90, 94], ["B+", 85, 89], ["B", 80, 84],
    ["B−", 75, 79], ["C+", 70, 74], ["C", 65, 69], ["C−", 60, 64],
    ["D+", 55, 59], ["D", 50, 54], ["FX", 25, 49], ["F", 0, 24],
  ];
  for (const [grade, minimum, maximum] of bands) {
    assert.equal(gradeFromScore(minimum), grade);
    assert.equal(gradeFromScore(maximum), grade);
  }
  for (const invalid of [-1, 101, 94.5, NaN, Infinity]) assert.equal(gradeFromScore(invalid), null);
});

test("FX даёт 0.50 в GPA без зачтённых кредитов", () => {
  assert.equal(calculateGpa([{ credits: 3, grade: "A" }, { credits: 2, grade: "FX" }]), 2.6);
  assert.equal(earnsCredits("FX"), false);
  assert.equal(earnsCredits("F"), false);
  assert.equal(earnsCredits(null), false);
  assert.equal(earnsCredits("D"), true);
});
