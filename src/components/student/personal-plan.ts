"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { defaultAcademicCalendarId, isAcademicCalendarId, type AcademicCalendarId } from "@/lib/academic-calendar";
import { createBrowserStore } from "@/lib/browser-store";
import { useDemoCatalog, type DemoCatalog } from "@/lib/demo-catalog";
import { demoSubjects } from "@/lib/demo-data";
import { useDemoSession } from "@/lib/demo-session";
import type { Grade, Subject } from "@/lib/types";
import { gradeFromScore, gradeOptions, isAssessmentScore } from "./integration-adapter";

export type SubjectAssessment = { rk1: number | null; rk2: number | null; exam: number | null; finalScore: number | null };
type StudentProgress = {
  subjects: Subject[] | null;
  forecast: Record<string, Grade>;
  calendarId: AcademicCalendarId;
  assessments: Record<string, SubjectAssessment>;
};
type ProgressByEmail = Record<string, StudentProgress>;

const emptySubjects: Subject[] = [];
const emptyForecast: Record<string, Grade> = {};
const emptyProgress: StudentProgress = {
  subjects: null,
  forecast: emptyForecast,
  calendarId: defaultAcademicCalendarId,
  assessments: {},
};
const store = createBrowserStore<ProgressByEmail>("scholarpath.student-progress.v1", {}, parseProgress);

function isGrade(value: unknown): value is Grade {
  return gradeOptions.some((grade) => grade === value);
}

function isSubject(value: unknown): value is Subject {
  if (!value || typeof value !== "object") return false;
  const { id, code, title, groupId, credits, semester, grade } = value as Partial<Subject>;
  return typeof id === "string" && Boolean(id) && typeof code === "string" &&
    typeof title === "string" && typeof groupId === "string" &&
    typeof credits === "number" && Number.isInteger(credits) && credits > 0 && credits <= 30 &&
    typeof semester === "number" && Number.isInteger(semester) && semester > 0 &&
    (grade === null || isGrade(grade));
}

function parseAssessment(value: unknown): SubjectAssessment {
  const scores = value && typeof value === "object" ? value as Partial<SubjectAssessment> : {};
  return {
    rk1: isAssessmentScore(scores.rk1) ? scores.rk1 : null,
    rk2: isAssessmentScore(scores.rk2) ? scores.rk2 : null,
    exam: isAssessmentScore(scores.exam) ? scores.exam : null,
    finalScore: isAssessmentScore(scores.finalScore) && Number.isInteger(scores.finalScore) ? scores.finalScore : null,
  };
}

function parseProgress(raw: string): ProgressByEmail | null {
  try {
    const saved = JSON.parse(raw) as Partial<ProgressByEmail> | null;
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return null;
    const entries = Object.entries(saved).map(([email, progress]) => {
      const subjects = Array.isArray(progress?.subjects) ? progress.subjects.filter(isSubject) : null;
      const forecast = Object.fromEntries(Object.entries(progress?.forecast ?? {})
        .filter(([, grade]) => isGrade(grade)));
      const assessments = Object.fromEntries((subjects ?? [])
        .filter((subject) => progress?.assessments && Object.hasOwn(progress.assessments, subject.id))
        .map((subject) => [subject.id, parseAssessment(progress?.assessments?.[subject.id])]));
      const calendarId = isAcademicCalendarId(progress?.calendarId) ? progress.calendarId : defaultAcademicCalendarId;
      return [email, { subjects, forecast, assessments, calendarId }];
    });
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

export function subjectsForGroup(catalog: DemoCatalog, groupId: string, semester?: number) {
  const ids = new Set(catalog.studyPlans
    .filter((plan) => plan.groupId === groupId && (semester === undefined || plan.semester === semester))
    .flatMap((plan) => plan.subjectIds));
  return catalog.subjects.filter((subject) => ids.has(subject.id));
}

function updateProgress(email: string, update: (current: StudentProgress) => StudentProgress) {
  store.update((accounts) => {
    const current = Object.hasOwn(accounts, email) ? accounts[email] : emptyProgress;
    const next = update(current);
    return next === current ? accounts : { ...accounts, [email]: next };
  });
}

export function usePersonalPlan() {
  const session = useDemoSession();
  const catalog = useDemoCatalog();
  const accounts = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const email = session?.profile ? session.email : undefined;
  const groupId = session?.profile?.groupId;
  const progress = email && Object.hasOwn(accounts, email) ? accounts[email] : emptyProgress;
  const initialSubjects = useMemo(() => {
    if (!groupId) return emptySubjects;
    return subjectsForGroup(catalog, groupId).map((subject) => {
      const example = demoSubjects.find((item) => item.id === subject.id &&
        item.groupId === groupId && item.semester === subject.semester);
      return { ...subject, grade: example?.grade ?? null };
    });
  }, [catalog, groupId]);
  const subjects = progress.subjects ?? initialSubjects;

  useEffect(() => {
    if (email) updateProgress(email, (current) => current.subjects === null
      ? { ...current, subjects: initialSubjects }
      : current);
  }, [email, initialSubjects]);

  function setGrade(id: string, grade: Grade | null) {
    if (!email) return;
    updateProgress(email, (current) => {
      const plan = current.subjects ?? initialSubjects;
      if (!plan.some((subject) => subject.id === id && subject.grade !== grade)) return current;
      const previous = current.assessments[id];
      const assessments = previous?.finalScore != null
        ? { ...current.assessments, [id]: { ...previous, finalScore: null } }
        : current.assessments;
      return { ...current, assessments, subjects: plan.map((subject) => subject.id === id ? { ...subject, grade } : subject) };
    });
  }

  function setAssessment(id: string, assessment: SubjectAssessment) {
    if (!email) return;
    const scores = parseAssessment(assessment);
    updateProgress(email, (current) => {
      const plan = current.subjects ?? initialSubjects;
      const subject = plan.find((item) => item.id === id);
      if (!subject) return current;
      const hadFinalScore = current.assessments[id]?.finalScore != null;
      const grade = scores.finalScore !== null ? gradeFromScore(scores.finalScore) : hadFinalScore ? null : subject.grade;
      return {
        ...current,
        assessments: { ...current.assessments, [id]: scores },
        subjects: plan.map((item) => item.id === id ? { ...item, grade } : item),
      };
    });
  }

  function setAcademicCalendar(calendarId: AcademicCalendarId) {
    if (email) updateProgress(email, (current) => current.calendarId === calendarId ? current : { ...current, calendarId });
  }

  function addSubjects(selection: readonly Subject[]) {
    if (!email) return 0;
    let added = 0;
    updateProgress(email, (current) => {
      const plan = current.subjects ?? initialSubjects;
      const additions = selection.filter((subject) => !plan.some((existing) => existing.id === subject.id));
      added = additions.length;
      return added ? { ...current, subjects: [...plan, ...additions.map((subject) => ({ ...subject, grade: null }))] } : current;
    });
    return added;
  }

  function setForecastGrade(id: string, grade: Grade | null) {
    if (!email) return;
    updateProgress(email, (current) => {
      const forecast = { ...current.forecast };
      if (grade === null) delete forecast[id];
      else forecast[id] = grade;
      return { ...current, forecast };
    });
  }

  function resetForecast() {
    if (email) updateProgress(email, (current) => ({ ...current, forecast: emptyForecast }));
  }

  return {
    session, catalog, subjects, setGrade, addSubjects,
    forecast: progress.forecast, setForecastGrade, resetForecast,
    calendarId: progress.calendarId, setAcademicCalendar,
    assessments: progress.assessments, setAssessment,
  };
}
