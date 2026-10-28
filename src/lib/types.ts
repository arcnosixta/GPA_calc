export type Grade =
  | "A" | "A−" | "B+" | "B" | "B−" | "C+" | "C" | "C−" | "D+" | "D" | "F";

export type Subject = {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester: number;
  groupId: string;
  grade: Grade | null;
};

export type Group = {
  id: string;
  name: string;
  program: string;
  year: number;
  subjectCount: number;
};

export type Student = {
  name: string;
  initials: string;
  groupId: string;
  semester: number;
};
