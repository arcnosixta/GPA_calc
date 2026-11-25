import assert from "node:assert/strict";
import { test } from "node:test";
import { browser } from "../../lib/browser-test-runtime.mjs";

const studentPath = "src/components/student/";
const progressKey = "scholarpath.student-progress.v1";
const email = "grading-qa@example.com";
const subject = { id: "math", code: "MAT 201", title: "Математика", credits: 3, semester: 3, groupId: "is-24-1", grade: null };
const secondSubject = { ...subject, id: "programming", code: "CS 201", title: "Программирование", credits: 2, grade: "B" };
const emptyScores = { rk1: null, rk2: null, exam: null };

// Приказ № 595, приложение 1 к Типовым правилам деятельности ОВПО.
// https://www.gov.kz/org/control/documents/details/39111?lang=ru
const officialScale = [
  ["A", 95, 100, 4],
  ["A−", 90, 94, 3.67],
  ["B+", 85, 89, 3.33],
  ["B", 80, 84, 3],
  ["B−", 75, 79, 2.67],
  ["C+", 70, 74, 2.33],
  ["C", 65, 69, 2],
  ["C−", 60, 64, 1.67],
  ["D+", 55, 59, 1.33],
  ["D", 50, 54, 1],
  ["FX", 25, 49, 0.5],
  ["F", 0, 24, 0],
];

function gradingFixture({ grade = null, assessment, additionalSubjects = [] } = {}) {
  const profile = { firstName: "Демо", lastName: "Оценивание", universityId: "central", groupId: "is-24-1" };
  const progress = {
    subjects: [{ ...subject, grade }, ...additionalSubjects],
    forecast: {},
    assessments: assessment ? { [subject.id]: assessment } : {},
  };
  const data = new Map([
    ["scholarpath.demo-session.v2", JSON.stringify({ active: { email, role: "student" }, profiles: { [email]: profile } })],
    [progressKey, JSON.stringify({ [email]: progress })],
  ]);
  const runtime = browser(data);
  const { usePersonalPlan: readPlan } = runtime.loadProject(studentPath + "personal-plan.ts");
  const { calculateGpa } = runtime.loadProject(studentPath + "integration-adapter.ts");
  const savedScores = () => JSON.parse(data.get(progressKey))[email].assessments[subject.id];
  const reloadPlan = () => browser(data).loadProject(studentPath + "personal-plan.ts").usePersonalPlan();
  return { readPlan, reloadPlan, calculateGpa, savedScores };
}

test("границы, баллы и зачёт кредитов соответствуют опубликованной шкале", () => {
  const { gradeFromScore, gradeOptions, gradePoints, earnsCredits } = browser().loadProject(studentPath + "integration-adapter.ts");

  assert.deepEqual([...gradeOptions], officialScale.map(([grade]) => grade));
  for (const [grade, minimum, maximum, points] of officialScale) {
    assert.equal(gradeFromScore(minimum), grade, `${minimum}%`);
    assert.equal(gradeFromScore(maximum), grade, `${maximum}%`);
    assert.equal(gradePoints[grade], points, grade);
    assert.equal(earnsCredits(grade), grade !== "FX" && grade !== "F", grade);
  }
  assert.equal(earnsCredits(null), false);
  for (const invalid of [-1, 101, 94.5, NaN, Infinity, "95", null]) {
    assert.equal(gradeFromScore(invalid), null, String(invalid));
  }
});

test("итоговая оценка учитывает оба РК и экзамен с весами 30/30/40", () => {
  const { calculateAssessmentResult } = browser().loadProject(studentPath + "integration-adapter.ts");
  const cases = [
    [{ rk1: 0, rk2: 0, exam: 0 }, { score: 0, grade: "F" }],
    [{ rk1: 0, rk2: 0, exam: 1e-7 }, { score: 0, grade: "F" }],
    [{ rk1: 100, rk2: 0, exam: 0 }, { score: 30, grade: "FX" }],
    [{ rk1: 0, rk2: 100, exam: 0 }, { score: 30, grade: "FX" }],
    [{ rk1: 0, rk2: 0, exam: 100 }, { score: 40, grade: "FX" }],
    [{ rk1: 0, rk2: 0, exam: 30 }, { score: 12, grade: "F" }],
    [{ rk1: 4.1, rk2: 66.1, exam: 8.59 }, { score: 24, grade: "F" }],
    [{ rk1: 4.1, rk2: 66.1, exam: 8.6 }, { score: 25, grade: "FX" }],
    [{ rk1: 4.1, rk2: 66.1, exam: 8.61 }, { score: 25, grade: "FX" }],
    [{ rk1: 80, rk2: 90, exam: 100 }, { score: 91, grade: "A−" }],
    [{ rk1: 88.5, rk2: 88.5, exam: 91 }, { score: 90, grade: "A−" }],
    [{ rk1: 100, rk2: 100, exam: 100 }, { score: 100, grade: "A" }],
  ];
  for (const [scores, expected] of cases) {
    assert.deepEqual({ ...calculateAssessmentResult(scores) }, expected);
  }
});

test("итог появляется только с тремя допустимыми баллами", () => {
  const { calculateAssessmentResult } = browser().loadProject(studentPath + "integration-adapter.ts");
  const scores = { rk1: 0, rk2: 0, exam: 30 };

  assert.equal(calculateAssessmentResult(), null);
  assert.equal(calculateAssessmentResult(emptyScores), null);
  for (const field of Object.keys(scores)) {
    for (const invalid of [null, undefined, -1, 101, "0", "", NaN, Infinity]) {
      assert.equal(calculateAssessmentResult({ ...scores, [field]: invalid }), null, `${field}: ${invalid}`);
    }
  }
});

test("сохранённые оценки без баллов РК и экзамена остаются доступными", () => {
  const rawGrade = gradingFixture({ grade: "A" });
  const oldFinalScore = gradingFixture({ assessment: { ...emptyScores, finalScore: 91 } });

  assert.equal(rawGrade.readPlan().subjects[0].grade, "A");
  assert.equal(oldFinalScore.reloadPlan().subjects[0].grade, "A−");
  rawGrade.readPlan().setAssessment(subject.id, emptyScores);
  oldFinalScore.readPlan().setAssessment(subject.id, emptyScores);
  assert.equal(rawGrade.reloadPlan().subjects[0].grade, "A");
  assert.equal(oldFinalScore.reloadPlan().subjects[0].grade, "A−");
});

test("сохранённые компоненты имеют приоритет над прежней оценкой и баллом ведомости", () => {
  const lowScores = { rk1: 0, rk2: 0, exam: 30, finalScore: 96 };
  const full = gradingFixture({ grade: "A", assessment: lowScores, additionalSubjects: [secondSubject] });
  const partial = gradingFixture({ grade: "A", assessment: { ...lowScores, rk2: null } });

  assert.equal(full.readPlan().subjects[0].grade, "F");
  assert.equal(full.calculateGpa(full.reloadPlan().subjects), 1.2);
  assert.equal(partial.readPlan().subjects[0].grade, null);
  assert.equal(partial.calculateGpa(partial.reloadPlan().subjects), null);
});

test("GPA пересчитывается после сохранения, повторного чтения и очистки баллов", () => {
  const { readPlan, reloadPlan, calculateGpa, savedScores } = gradingFixture({
    grade: "A",
    assessment: { ...emptyScores, finalScore: 96 },
    additionalSubjects: [secondSubject],
  });
  const complete = { rk1: 4.1, rk2: 66.1, exam: 8.6 };
  const partial = { ...complete, exam: null };
  const checkAfterReload = (grade, gpa) => {
    const { subjects } = reloadPlan();
    assert.equal(subjects[0].grade, grade);
    assert.equal(calculateGpa(subjects), gpa);
  };

  readPlan().setAssessment(subject.id, complete);
  assert.deepEqual(savedScores(), complete);
  checkAfterReload("FX", 1.5);

  readPlan().setAssessment(subject.id, partial);
  assert.deepEqual(savedScores(), partial);
  checkAfterReload(null, 3);

  readPlan().setAssessment(subject.id, emptyScores);
  checkAfterReload(null, 3);
});
