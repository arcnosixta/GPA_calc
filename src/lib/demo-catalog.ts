"use client";

import { useSyncExternalStore } from "react";
import { createBrowserStore } from "./browser-store";
import {
  academicSources, calendarUniversity, initialAcademicCalendars, isCatalogAcademicCalendar, validateCalendarTerms,
  type AcademicSource, type CatalogAcademicCalendar, type CalendarTerm,
} from "./catalog-calendars";
import { demoGroups, demoSemesters, demoSubjects, demoUniversities } from "./demo-data";
import type { DemoSession } from "./demo-session";
import type { Group, Subject } from "./types";

export type CatalogProgram = { id: string; name: string; universityId: string };
export type CatalogGroup = Group & { programId: string };
export type CatalogSemester = { number: number; title: string; active: boolean };
export type CatalogPlan = { id: string; groupId: string; semester: number; subjectIds: string[] };
export type CatalogUser = { id: string; name: string; role: "student" | "moderator" | "admin"; groupIds: string[] };
export type CatalogSubjectInput = Omit<Subject, "id" | "grade">;
export type CatalogResult = { ok: boolean; error?: string };
type Session = DemoSession | null | undefined;

export type DemoCatalog = {
  universities: { id: string; name: string }[];
  programs: CatalogProgram[];
  groups: CatalogGroup[];
  subjects: Subject[];
  archivedSubjects: Subject[];
  semesters: CatalogSemester[];
  studyPlans: CatalogPlan[];
  users: CatalogUser[];
  moderatorUniversityIds: string[];
  academicCalendars: CatalogAcademicCalendar[];
  academicSources: AcademicSource[];
};

// Имена вымышленные. Демообласть роли «Модератор» принадлежит этой записи.
export const demoModeratorId = "demo-moderator";
export const demoModeratorName = "Дамир Соколов";
const initialCatalog: DemoCatalog = {
  universities: [...demoUniversities.map((item) => ({ ...item })), calendarUniversity],
  programs: demoGroups.map((group) => ({ id: "program-" + group.id, name: group.program, universityId: group.universityId })),
  groups: demoGroups.map((group) => ({ ...group, programId: "program-" + group.id })),
  // Личные оценки не входят в каталог. Их исходные значения остаются в demo-data.
  subjects: demoSubjects.map((subject) => ({ ...subject, grade: null })),
  archivedSubjects: [],
  semesters: demoSemesters.map((number) => ({ number, title: `${number} семестр`, active: true })),
  studyPlans: demoGroups.flatMap((group) => demoSemesters.flatMap((semester) => {
    const subjectIds = demoSubjects.filter((item) => item.groupId === group.id && item.semester === semester).map((item) => item.id);
    return subjectIds.length ? [{ id: `${group.id}-${semester}`, groupId: group.id, semester, subjectIds }] : [];
  })),
  users: [
    { id: demoModeratorId, name: demoModeratorName, role: "moderator", groupIds: ["is-24-1"] },
    { id: "demo-student-1", name: "Алина Волкова", role: "student", groupIds: [] },
    { id: "demo-student-2", name: "Тимур Орлов", role: "student", groupIds: [] },
    { id: "demo-admin", name: "Ирина Белова", role: "admin", groupIds: [] },
  ],
  moderatorUniversityIds: [],
  academicCalendars: initialAcademicCalendars,
  academicSources,
};

// Каталог общий для деморолей в одном браузере.
const storageKey = "scholarpath.demo-catalog.v1";

function parseCatalog(raw: string): DemoCatalog | null {
  try {
    const saved = JSON.parse(raw);
    const oldKeys = Object.keys(initialCatalog).filter((key) => key !== "academicCalendars" && key !== "academicSources");
    if (saved.version !== 1 || !saved.data || !oldKeys.every((key) => Array.isArray(saved.data[key]))) {
      return null;
    }
    const data = saved.data as DemoCatalog;
    if (data.groups.every((item) => typeof item.id === "string" && typeof item.programId === "string") &&
        data.subjects.every((item) => typeof item.id === "string" && Number.isInteger(item.credits) && item.credits >= 1 && item.credits <= 30) &&
        data.users.every((item) => Array.isArray(item.groupIds)) &&
        data.studyPlans.every((item) => Array.isArray(item.subjectIds))) {
      // Дополняем старый каталог, не сбрасывая предметы, группы и настройки пользователя.
      const universities = data.universities.some((item) => item.id === calendarUniversity.id)
        ? data.universities : [...data.universities, calendarUniversity];
      const calendars = Array.isArray(data.academicCalendars)
        ? data.academicCalendars.filter(isCatalogAcademicCalendar) : [];
      return {
        ...data, universities, academicSources,
        academicCalendars: initialAcademicCalendars.map((initial) => calendars.find((item) =>
          item.id === initial.id && item.universityId === initial.universityId &&
          item.academicYear === initial.academicYear && item.sourceId === initial.sourceId &&
          item.terms.every((term) => initial.terms.some((original) => original.id === term.id && original.season === term.season))) ?? initial),
      };
    }
  } catch { /* Повреждённый снимок заменяется исходным примером. */ }
  return null;
}

const {
  getSnapshot: getCatalog,
  getServerSnapshot,
  subscribe,
  update: updateCatalogStore,
} = createBrowserStore(storageKey, initialCatalog, parseCatalog, {
  legacy: { key: storageKey },
  serialize: (data) => JSON.stringify({ version: 1, data }),
});

export function useDemoCatalog() {
  return useSyncExternalStore(subscribe, getCatalog, getServerSnapshot);
}

function updateCatalog(next: DemoCatalog): CatalogResult {
  const activeIds = new Set(next.subjects.map((subject) => subject.id));
  updateCatalogStore(() => ({
    ...next,
    groups: next.groups.map((group) => ({
      ...group,
      subjectCount: new Set(next.studyPlans.filter((plan) => plan.groupId === group.id)
        .flatMap((plan) => plan.subjectIds.filter((id) => activeIds.has(id)))).size,
    })),
  }));
  return { ok: true };
}

function failure(error: string): CatalogResult { return { ok: false, error }; }
function validName(name: string, max = 120) { return name.trim().length > 0 && name.trim().length <= max; }
function newId(prefix: string) { return prefix + "-" + crypto.randomUUID(); }

export function getManagedGroupIds(session: Session, snapshot: DemoCatalog): string[] {
  if (session?.role === "admin") return snapshot.groups.map((group) => group.id);
  if (session?.role !== "moderator") return [];
  const moderator = snapshot.users.find((user) => user.id === demoModeratorId);
  return moderator?.role === "moderator" ? moderator.groupIds : [];
}

export function getManagedUniversityIds(session: Session, snapshot: DemoCatalog): string[] {
  if (session?.role === "admin") return snapshot.universities.map((item) => item.id);
  if (session?.role !== "moderator") return [];
  const moderator = snapshot.users.find((user) => user.id === demoModeratorId);
  if (moderator?.role !== "moderator") return [];
  const groupIds = getManagedGroupIds(session, snapshot);
  return [...new Set([...snapshot.moderatorUniversityIds,
    ...snapshot.groups.filter((group) => groupIds.includes(group.id)).map((group) => group.universityId)])];
}

export function saveCatalogSubject(session: Session, input: CatalogSubjectInput, id?: string): CatalogResult {
  const state = getCatalog();
  const managed = getManagedGroupIds(session, state);
  const previous = id ? state.subjects.find((item) => item.id === id) : undefined;
  if ((id && !previous) || !managed.includes(input.groupId) || (previous && !managed.includes(previous.groupId))) {
    return failure("Предмет недоступен для изменения в этой демороли.");
  }
  if (!validName(input.title) || input.code.trim().length > 20) return failure("Проверьте название и код предмета.");
  if (!Number.isInteger(input.credits) || input.credits < 1 || input.credits > 30) return failure("Кредиты: целое число от 1 до 30.");
  const semester = state.semesters.find((item) => item.number === input.semester);
  if (!semester || (!semester.active && (!previous || previous.semester !== input.semester || previous.groupId !== input.groupId))) {
    return failure("Выберите семестр, открытый для новых записей.");
  }
  const code = input.code.trim();
  if (code && state.subjects.some((item) => item.id !== id && item.groupId === input.groupId && item.code.toLowerCase() === code.toLowerCase())) {
    return failure("В этой группе уже есть предмет с таким кодом.");
  }
  const subject: Subject = { ...input, title: input.title.trim(), code, id: id ?? newId("subject"), grade: null };
  const subjects = previous ? state.subjects.map((item) => item.id === id ? subject : item) : [...state.subjects, subject];
  let studyPlans = state.studyPlans;
  if (previous && (previous.groupId !== subject.groupId || previous.semester !== subject.semester)) {
    studyPlans = studyPlans.map((plan) => plan.groupId === previous.groupId && plan.semester === previous.semester
      ? { ...plan, subjectIds: plan.subjectIds.filter((item) => item !== subject.id) } : plan);
  }
  if (!previous || previous.groupId !== subject.groupId || previous.semester !== subject.semester) {
    const planId = `${subject.groupId}-${subject.semester}`;
    const existing = studyPlans.find((plan) => plan.id === planId);
    studyPlans = existing
      ? studyPlans.map((plan) => plan.id === planId ? { ...plan, subjectIds: [...new Set([...plan.subjectIds, subject.id])] } : plan)
      : [...studyPlans, { id: planId, groupId: subject.groupId, semester: subject.semester, subjectIds: [subject.id] }];
  }
  return updateCatalog({ ...state, subjects, studyPlans });
}

export function archiveCatalogSubject(session: Session, id: string): CatalogResult {
  const state = getCatalog();
  const subject = state.subjects.find((item) => item.id === id);
  if (!subject || !getManagedGroupIds(session, state).includes(subject.groupId)) return failure("Нет доступного предмета для архивирования.");
  // Старые связи плана остаются. Новый выбор использует только subjects.
  return updateCatalog({ ...state, subjects: state.subjects.filter((item) => item.id !== id), archivedSubjects: [...state.archivedSubjects, subject] });
}

export function saveUniversity(session: Session, input: { name: string }, id?: string): CatalogResult {
  const state = getCatalog();
  if (session?.role !== "admin" && session?.role !== "moderator") return failure("Справочник доступен сотрудникам в деморежиме.");
  if (session.role === "moderator" && state.users.find((item) => item.id === demoModeratorId)?.role !== "moderator") return failure("Демонстрационная область модератора не назначена.");
  if (id && (!getManagedUniversityIds(session, state).includes(id) || !state.universities.some((item) => item.id === id))) return failure("Этот вуз вне вашей демонстрационной области.");
  const name = input.name.trim();
  if (!validName(name)) return failure("Введите название вуза от 1 до 120 символов.");
  if (state.universities.some((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) return failure("Вуз с таким названием уже есть.");
  const university = { id: id ?? newId("university"), name };
  return updateCatalog({ ...state,
    universities: id ? state.universities.map((item) => item.id === id ? university : item) : [...state.universities, university],
    moderatorUniversityIds: !id && session.role === "moderator" ? [...state.moderatorUniversityIds, university.id] : state.moderatorUniversityIds,
  });
}

export function saveProgram(session: Session, input: { name: string; universityId: string }, id?: string): CatalogResult {
  const state = getCatalog();
  const managed = getManagedUniversityIds(session, state);
  const previous = state.programs.find((item) => item.id === id);
  if (!managed.includes(input.universityId) || (id && (!previous || !managed.includes(previous.universityId)))) return failure("Направление вне вашей демонстрационной области.");
  const name = input.name.trim();
  if (!validName(name)) return failure("Введите название направления от 1 до 120 символов.");
  if (previous && previous.universityId !== input.universityId && state.groups.some((group) => group.programId === id)) return failure("Направление используется группами: его вуз менять нельзя.");
  if (state.programs.some((item) => item.id !== id && item.universityId === input.universityId && item.name.toLowerCase() === name.toLowerCase())) return failure("В этом вузе уже есть такое направление.");
  const program = { id: id ?? newId("program"), name, universityId: input.universityId };
  return updateCatalog({ ...state,
    programs: id ? state.programs.map((item) => item.id === id ? program : item) : [...state.programs, program],
    groups: state.groups.map((group) => group.programId === id ? { ...group, program: name } : group),
  });
}

export function saveGroup(session: Session, input: { name: string; programId: string; year: number }, id?: string): CatalogResult {
  const state = getCatalog();
  if (session?.role !== "admin") return failure("Создавать и изменять группы может только демоадминистратор.");
  const program = state.programs.find((item) => item.id === input.programId);
  const previous = state.groups.find((item) => item.id === id);
  if (id && !previous) return failure("Группа не найдена.");
  if (!validName(input.name, 60)) return failure("Введите название группы от 1 до 60 символов.");
  if (!program) return failure("Выберите направление.");
  if (!Number.isInteger(input.year) || input.year < 1 || input.year > 6) return failure("Курс: целое число от 1 до 6.");
  const name = input.name.trim();
  if (state.groups.some((item) => item.id !== id && item.universityId === program.universityId && item.name.toLowerCase() === name.toLowerCase())) return failure("В этом вузе уже есть группа с таким названием.");
  const group: CatalogGroup = { id: id ?? newId("group"), name, year: input.year, programId: program.id, program: program.name,
    universityId: program.universityId, subjectCount: previous?.subjectCount ?? 0 };
  return updateCatalog({ ...state, groups: id ? state.groups.map((item) => item.id === id ? group : item) : [...state.groups, group] });
}

export function updateSemester(session: Session, number: number, input: { title: string; active: boolean }): CatalogResult {
  const state = getCatalog();
  if (session?.role !== "admin") return failure("Общие семестры настраивает демоадминистратор.");
  if (!state.semesters.some((item) => item.number === number)) return failure("Семестр не найден.");
  if (!validName(input.title, 60)) return failure("Название семестра: от 1 до 60 символов.");
  return updateCatalog({ ...state, semesters: state.semesters.map((item) => item.number === number ? { ...item, ...input, title: input.title.trim() } : item) });
}

export function updateAcademicCalendar(session: Session, id: string, input: { scope: string; terms: CalendarTerm[] }): CatalogResult {
  const state = getCatalog();
  const previous = state.academicCalendars.find((item) => item.id === id);
  if (!previous || !getManagedUniversityIds(session, state).includes(previous.universityId)) {
    return failure("Календарь находится вне вашей области управления.");
  }
  if (!validName(input.scope, 240)) return failure("Укажите область применения от 1 до 240 символов.");
  const error = validateCalendarTerms(input.terms);
  if (error) return failure(error);
  const [firstYear, lastYear] = previous.academicYear.split("-");
  const ranges = input.terms.flatMap((term) => [term.period, term.rk1, term.rk2]);
  if (ranges.some((range) => range?.kind === "dates" &&
      (range.start < `${firstYear}-01-01` || range.end > `${lastYear}-12-31`))) {
    return failure(`Даты должны относиться к годам ${firstYear}–${lastYear}. Для другого учебного года нужна отдельная запись.`);
  }
  if (input.terms.some((term) => !previous.terms.some((item) => item.id === term.id && item.season === term.season))) {
    return failure("Идентификаторы учебных периодов менять нельзя.");
  }
  const calendar: CatalogAcademicCalendar = {
    ...previous, scope: input.scope.trim(), terms: structuredClone(input.terms), status: "local",
  };
  return updateCatalog({ ...state, academicCalendars: state.academicCalendars.map((item) => item.id === id ? calendar : item) });
}

export function saveStudyPlan(session: Session, input: { groupId: string; semester: number; subjectIds: string[] }): CatalogResult {
  const state = getCatalog();
  if (!getManagedGroupIds(session, state).includes(input.groupId)) return failure("Группа вне назначенной области.");
  const semester = state.semesters.find((item) => item.number === input.semester);
  const id = `${input.groupId}-${input.semester}`;
  const previous = state.studyPlans.find((plan) => plan.id === id);
  if (!semester || (!semester.active && !previous)) return failure("Этот семестр закрыт для новых планов.");
  const subjectIds = [...new Set(input.subjectIds)];
  const activeIds = new Set(state.subjects.map((subject) => subject.id));
  if (subjectIds.some((item) => !activeIds.has(item) && !previous?.subjectIds.includes(item))) return failure("Архивный или отсутствующий предмет нельзя добавить в новый выбор.");
  const managedGroups = getManagedGroupIds(session, state);
  if (subjectIds.some((item) => !previous?.subjectIds.includes(item) &&
      !managedGroups.includes(state.subjects.find((subject) => subject.id === item)?.groupId ?? ""))) {
    return failure("Новый предмет должен относиться к назначенной группе.");
  }
  if (!semester.active && subjectIds.some((item) => !previous?.subjectIds.includes(item))) return failure("Семестр закрыт: можно только убрать предметы из существующего плана.");
  const plan: CatalogPlan = { id, groupId: input.groupId, semester: input.semester, subjectIds };
  return updateCatalog({ ...state, studyPlans: previous ? state.studyPlans.map((item) => item.id === id ? plan : item) : [...state.studyPlans, plan] });
}

export function updateDemoUser(session: Session, id: string, input: { role: "student" | "moderator"; groupIds: string[] }): CatalogResult {
  const state = getCatalog();
  if (session?.role !== "admin") return failure("Роли назначает только демоадминистратор.");
  const user = state.users.find((item) => item.id === id);
  if (!user || user.role === "admin") return failure("Администраторская запись не изменяется.");
  if (input.role !== "student" && input.role !== "moderator") return failure("Выберите роль студента или модератора.");
  if (input.groupIds.some((groupId) => !state.groups.some((group) => group.id === groupId))) return failure("Одна из групп отсутствует в каталоге.");
  const groupIds = input.role === "moderator" ? [...new Set(input.groupIds)] : [];
  return updateCatalog({ ...state, users: state.users.map((item) => item.id === id ? { ...item, role: input.role, groupIds } : item) });
}
