import assert from "node:assert/strict";
import { test } from "node:test";
import { browser } from "../../lib/browser-test-runtime.mjs";

const { selectHistoryRecords } = browser().loadProject("src/components/management/history-data.ts");

function record(id, grade, credits, overrides = {}) {
  return Object.freeze({
    id,
    groupId: "demo-group",
    year: "2025–2026",
    semester: 3,
    code: id,
    title: id,
    grade,
    credits,
    ...overrides,
  });
}

const records = Object.freeze([
  record("a-minus-first", "A−", 3),
  record("ungraded", null, 3),
  record("fx", "FX", 1),
  record("a-minus-second", "A−", 3),
  record("f", "F", 5),
  record("b-plus", "B+", 5),
]);

const ids = (rows) => Array.from(rows, ({ id }) => id);

test("архив сочетает фильтры и различает любую оценку и отсутствие оценки", () => {
  const candidates = [
    record("previous-year", null, 3, { year: "2024–2025" }),
    record("other-semester", null, 3, { semester: 4 }),
    record("other-credits", null, 4),
    record("ungraded", null, 3),
    record("graded", "A−", 3),
  ];
  const filters = { year: "2025–2026", semester: 3, credits: 3 };

  assert.deepEqual(ids(selectHistoryRecords(candidates, filters)), ["ungraded", "graded"]);
  assert.deepEqual(ids(selectHistoryRecords(candidates, { ...filters, grade: null })), ["ungraded"]);
  assert.deepEqual(ids(selectHistoryRecords(candidates, { ...filters, grade: "A−" })), ["graded"]);
  assert.deepEqual(ids(selectHistoryRecords(candidates, { ...filters, grade: "F" })), []);
});

test("сортировка оценок использует шкалу GPA и оставляет записи без оценки в конце", () => {
  assert.deepEqual(ids(selectHistoryRecords(records, { sort: "grade-asc" })), [
    "f", "fx", "b-plus", "a-minus-first", "a-minus-second", "ungraded",
  ]);
  assert.deepEqual(ids(selectHistoryRecords(records, { sort: "grade-desc" })), [
    "a-minus-first", "a-minus-second", "b-plus", "fx", "f", "ungraded",
  ]);
});

test("сортировка кредитов сохраняет порядок равных записей и не меняет исходный архив", () => {
  assert.deepEqual(ids(selectHistoryRecords(records, { sort: "credits-asc" })), [
    "fx", "a-minus-first", "ungraded", "a-minus-second", "f", "b-plus",
  ]);
  assert.deepEqual(ids(selectHistoryRecords(records, { sort: "credits-desc" })), [
    "f", "b-plus", "a-minus-first", "ungraded", "a-minus-second", "fx",
  ]);
  assert.deepEqual(ids(selectHistoryRecords(records, {})), [
    "a-minus-first", "ungraded", "fx", "a-minus-second", "f", "b-plus",
  ]);
});
