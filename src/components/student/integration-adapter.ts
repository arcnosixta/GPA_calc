import type { Grade, Subject } from "@/lib/types";

export const gradeScaleSource = "https://www.gov.kz/org/control/documents/details/39111?lang=ru";

// Общая шкала из приложения 1 к типовым правилам деятельности ОВПО.
const gradeScale: Record<Grade, { minimum: number; points: number }> = {
  A: { minimum: 95, points: 4 },
  "A−": { minimum: 90, points: 3.67 },
  "B+": { minimum: 85, points: 3.33 },
  B: { minimum: 80, points: 3 },
  "B−": { minimum: 75, points: 2.67 },
  "C+": { minimum: 70, points: 2.33 },
  C: { minimum: 65, points: 2 },
  "C−": { minimum: 60, points: 1.67 },
  "D+": { minimum: 55, points: 1.33 },
  D: { minimum: 50, points: 1 },
  FX: { minimum: 25, points: 0.5 },
  F: { minimum: 0, points: 0 },
};

export const gradeOptions = Object.keys(gradeScale) as Grade[];
export const gradePoints = Object.fromEntries(gradeOptions.map((grade) => [grade, gradeScale[grade].points])) as Record<Grade, number>;

export function isAssessmentScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function gradeFromScore(score: number): Grade | null {
  if (!isAssessmentScore(score) || !Number.isInteger(score)) return null;
  return gradeOptions.find((grade) => score >= gradeScale[grade].minimum) ?? null;
}

export function earnsCredits(grade: Grade | null) {
  return grade !== null && gradePoints[grade] >= gradePoints.D;
}

export function calculateGpa(subjects: readonly { credits: number; grade: Grade | null }[]): number | null {
  let credits = 0;
  let points = 0;
  for (const subject of subjects) {
    if (subject.grade === null) continue;
    credits += subject.credits;
    points += subject.credits * gradePoints[subject.grade];
  }
  return credits ? points / credits : null;
}

export type GpaHistoryPoint = {
  semester: number;
  semesterGpa: number | null;
  cumulativeGpa: number | null;
};

export function calculateGpaHistory(subjects: readonly Pick<Subject, "semester" | "credits" | "grade">[]): GpaHistoryPoint[] {
  const semesters = [...new Set(subjects.map(({ semester }) => semester))].sort((a, b) => a - b);
  return semesters.map((semester) => ({
    semester,
    semesterGpa: calculateGpa(subjects.filter((subject) => subject.semester === semester)),
    cumulativeGpa: calculateGpa(subjects.filter((subject) => subject.semester <= semester)),
  }));
}
