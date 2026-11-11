import assert from "node:assert/strict";
import { test } from "node:test";
import { browser } from "../../lib/browser-test-runtime.mjs";

const studentPath = "src/components/student/";
const progressKey = "scholarpath.student-progress.v1";
const email = "grading-qa@example.com";
const subject = { id: "math", code: "MAT 201", title: "Математика", credits: 3, semester: 3, groupId: "is-24-1", grade: null };
const emptyScores = { rk1: null, rk2: null, exam: null, finalScore: null };

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

function gradingFixture() {
  const profile = { firstName: "Демо", lastName: "Оценивание", universityId: "central", groupId: "is-24-1" };
  const data = new Map([
    ["scholarpath.demo-session.v2", JSON.stringify({ active: { email, role: "student" }, profiles: { [email]: profile } })],
    [progressKey, JSON.stringify({ [email]: { subjects: [subject], forecast: {}, assessments: {} } })],
  ]);
  const runtime = browser(data);
  const { usePersonalPlan: readPlan } = runtime.loadProject(studentPath + "personal-plan.ts");
  const { calculateGpa } = runtime.loadProject(studentPath + "integration-adapter.ts");
  const savedScores = () => JSON.parse(data.get(progressKey))[email].assessments[subject.id];
  return { readPlan, calculateGpa, savedScores };
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

for (const field of Object.keys(emptyScores)) {
  test(`${field}: пустой балл, явно введённый ноль и недопустимые значения`, () => {
    const { readPlan, savedScores } = gradingFixture();

    readPlan().setAssessment(subject.id, emptyScores);
    assert.deepEqual(savedScores(), emptyScores);
    readPlan().setAssessment(subject.id, { ...emptyScores, [field]: 0 });
    assert.deepEqual(savedScores(), { ...emptyScores, [field]: 0 });

    const invalidScores = [-1, 101, "0", "", NaN, Infinity];
    if (field === "finalScore") invalidScores.push(89.5);
    for (const invalid of invalidScores) {
      readPlan().setAssessment(subject.id, { ...emptyScores, [field]: 0 });
      readPlan().setAssessment(subject.id, { ...emptyScores, [field]: invalid });
      assert.deepEqual(savedScores(), emptyScores, `${field}: ${invalid}`);
    }
  });
}

test("GPA следует подтверждённому итогу, а РК1, РК2 и экзамен остаются отдельными баллами", () => {
  const { readPlan, calculateGpa, savedScores } = gradingFixture();
  const scores = { rk1: 91.5, rk2: 95, exam: 100, finalScore: null };
  const checkGrade = (grade, gpa) => {
    const { subjects } = readPlan();
    assert.equal(subjects[0].grade, grade);
    assert.equal(calculateGpa(subjects), gpa);
  };

  readPlan().setAssessment(subject.id, scores);
  assert.deepEqual(savedScores(), scores);
  checkGrade(null, null);

  const confirmed = { ...scores, finalScore: 84 };
  readPlan().setAssessment(subject.id, confirmed);
  assert.deepEqual(savedScores(), confirmed);
  checkGrade("B", 3);

  const edited = { ...confirmed, rk1: 0, rk2: null, exam: 42 };
  readPlan().setAssessment(subject.id, edited);
  assert.deepEqual(savedScores(), edited);
  checkGrade("B", 3);

  readPlan().setAssessment(subject.id, { ...edited, finalScore: 25 });
  checkGrade("FX", 0.5);
  readPlan().setAssessment(subject.id, { ...edited, finalScore: 0 });
  checkGrade("F", 0);

  readPlan().setAssessment(subject.id, { ...edited, finalScore: null });
  assert.deepEqual(savedScores(), { ...edited, finalScore: null });
  checkGrade(null, null);

  readPlan().setAssessment(subject.id, confirmed);
  readPlan().setGrade(subject.id, "A");
  assert.deepEqual(savedScores(), scores);
  checkGrade("A", 4);
});
