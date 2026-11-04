// Временная граница интеграции: заменить на общие demo-catalog и gpa,
// когда владельцы передадут модули. Общие файлы команды не изменяются.
import { demoGroups, demoSubjects, demoUniversities } from "@/lib/demo-data";
import type { Grade } from "@/lib/types";

const catalog = { universities: demoUniversities, groups: demoGroups, subjects: demoSubjects };
export function useDemoCatalog() { return catalog; }

export const gradePoints: Record<Grade, number> = {
  A: 4, "A−": 3.7, "B+": 3.3, B: 3, "B−": 2.7,
  "C+": 2.3, C: 2, "C−": 1.7, "D+": 1.3, D: 1, F: 0,
};

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
