import assert from "node:assert/strict";
import { test } from "node:test";
import { browser } from "../../lib/browser-test-runtime.mjs";

const email = "legacy-plan@example.com";
const progressKey = "scholarpath.student-progress.v1";
const sessionKey = "scholarpath.demo-session.v2";
const groupId = "is-24-1";

const legacyPlan = {
  subjects: [
    { id: "math", code: "MAT 201", title: "Математика", groupId, credits: 7, semester: 3, grade: "A−" },
    { id: "programming", code: "CS 201", title: "Программирование", groupId, credits: 2, semester: 3, grade: "B" },
    { id: "english", code: "ENG 201", title: "Английский язык", groupId, credits: 3, semester: 3, grade: null },
  ],
  forecast: {},
  calendarId: "approximate",
};

function legacyStorage() {
  const profile = { firstName: "Демо", lastName: "Студент", universityId: "central", groupId };
  return new Map([
    [sessionKey, JSON.stringify({ active: { email, role: "student" }, profiles: { [email]: profile } })],
    [progressKey, JSON.stringify({ [email]: legacyPlan })],
  ]);
}

function readPlan(storage) {
  return browser(storage).loadProject("src/components/student/personal-plan.ts").usePersonalPlan();
}

test("личный план без записей РК сохраняет исходные оценки и кредиты при чтении", () => {
  const storage = legacyStorage();
  const original = storage.get(progressKey);
  const plan = readPlan(storage);

  assert.deepEqual(JSON.parse(JSON.stringify(plan.subjects)), legacyPlan.subjects);
  assert.deepEqual(Object.keys(plan.assessments), []);
  assert.equal(storage.get(progressKey), original);
});

test("запись и сброс прогноза сохраняют фактический план после повторного чтения", () => {
  const storage = legacyStorage();
  const saved = () => JSON.parse(storage.get(progressKey))[email];
  const plan = readPlan(storage);

  plan.setForecastGrade("english", "A");
  assert.deepEqual({ ...readPlan(storage).forecast }, { english: "A" });
  assert.deepEqual(saved(), { ...legacyPlan, forecast: { english: "A" }, assessments: {} });

  readPlan(storage).resetForecast();
  assert.deepEqual(Object.keys(readPlan(storage).forecast), []);
  assert.deepEqual(saved(), { ...legacyPlan, assessments: {} });
});
