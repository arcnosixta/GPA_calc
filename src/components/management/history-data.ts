import type { Grade } from "@/lib/types";

type HistoryRecord = {
  id: string;
  groupId: string;
  year: string;
  semester: number;
  code: string;
  title: string;
  credits: number;
  grade: Grade | null;
};

// Снимки учебных записей. Каталог не является источником старых оценок и кредитов.
// Это вымышленные примеры для выбранной группы, а не записи других пользователей.
export const historyRecords: readonly HistoryRecord[] = [
  { id: "is-1", groupId: "is-24-1", year: "2024–2025", semester: 1, code: "MAT 101", title: "Основы математики", credits: 3, grade: "B+" },
  { id: "is-2", groupId: "is-24-1", year: "2024–2025", semester: 1, code: "CS 101", title: "Введение в программирование", credits: 2, grade: "A" },
  { id: "is-3", groupId: "is-24-1", year: "2024–2025", semester: 2, code: "CS 102", title: "Алгоритмы", credits: 3, grade: "B" },
  { id: "is-4", groupId: "is-24-1", year: "2025–2026", semester: 3, code: "MAT 201", title: "Математика", credits: 3, grade: "A" },
  { id: "is-5", groupId: "is-24-1", year: "2025–2026", semester: 3, code: "CS 201", title: "Программирование", credits: 2, grade: "B" },
  { id: "is-6", groupId: "is-24-1", year: "2025–2026", semester: 3, code: "ENG 201", title: "Английский язык", credits: 3, grade: null },
  { id: "vt-1", groupId: "vt-24-1", year: "2024–2025", semester: 1, code: "PHY 101", title: "Основы электроники", credits: 3, grade: "B" },
  { id: "vt-2", groupId: "vt-24-1", year: "2024–2025", semester: 2, code: "CS 102", title: "Алгоритмы", credits: 3, grade: "F" },
  { id: "vt-3", groupId: "vt-24-1", year: "2025–2026", semester: 3, code: "NET 201", title: "Компьютерные сети", credits: 4, grade: null },
  { id: "vt-4", groupId: "vt-24-1", year: "2025–2026", semester: 3, code: "SYS 201", title: "Операционные системы", credits: 3, grade: null },
  { id: "se-1", groupId: "se-25-1", year: "2025–2026", semester: 1, code: "SE 101", title: "Введение в разработку", credits: 5, grade: null },
];
