import type { Grade, Group, Student, Subject } from "./types";

export const demoStudent: Student = {
  name: "Нурдаулет Курал",
  initials: "НК",
  groupId: "is-24-1",
  semester: 3,
};

export const demoGroups: Group[] = [
  { id: "is-24-1", name: "ИС-24-1", program: "Информационные системы", year: 2, subjectCount: 3 },
  { id: "vt-24-1", name: "ВТ-24-1", program: "Вычислительная техника", year: 2, subjectCount: 2 },
  { id: "se-25-1", name: "SE-25-1", program: "Программная инженерия", year: 1, subjectCount: 1 },
];

export const demoSemesters = [1, 2, 3, 4, 5, 6, 7, 8];

export const gradeOptions: Grade[] = [
  "A", "A−", "B+", "B", "B−", "C+", "C", "C−", "D+", "D", "F",
];

export const demoSubjects: Subject[] = [
  { id: "math", code: "MAT 201", title: "Математика", credits: 3, semester: 3, groupId: "is-24-1", grade: "A" },
  { id: "programming", code: "CS 201", title: "Программирование", credits: 2, semester: 3, groupId: "is-24-1", grade: "B" },
  { id: "english", code: "ENG 201", title: "Английский язык", credits: 3, semester: 3, groupId: "is-24-1", grade: null },
  { id: "networks", code: "NET 201", title: "Компьютерные сети", credits: 4, semester: 3, groupId: "vt-24-1", grade: null },
  { id: "systems", code: "SYS 201", title: "Операционные системы", credits: 3, semester: 3, groupId: "vt-24-1", grade: null },
  { id: "design", code: "SE 101", title: "Введение в разработку", credits: 5, semester: 1, groupId: "se-25-1", grade: null },
];

export const demoStudyPlan = demoSubjects.filter((subject) => subject.groupId === demoStudent.groupId);

// Статический пример из README. Расчёты и сохранение появятся на следующем этапе.
export const demoSummary = {
  overallGpa: "3.60",
  semesterGpa: "3.60",
  plannedCredits: 8,
  gradedCredits: 5,
  earnedCredits: 5,
  gradedSubjects: 2,
  totalSubjects: 3,
};
