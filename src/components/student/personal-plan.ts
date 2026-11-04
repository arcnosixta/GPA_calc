"use client";

import { useSyncExternalStore } from "react";
import { useDemoCatalog } from "./integration-adapter";
import { useDemoSession } from "@/lib/demo-session";
import type { Grade, Subject } from "@/lib/types";

const plans = new WeakMap<object, Subject[]>();
const listeners = new Set<() => void>();
const empty: Subject[] = [];
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function usePersonalPlan() {
  const session = useDemoSession();
  const catalog = useDemoCatalog();
  const profile = session?.profile;
  function getSnapshot() {
    if (!profile) return empty;
    let plan = plans.get(profile);
    if (!plan) {
      plan = catalog.subjects.filter((subject) => subject.groupId === profile.groupId).map((subject) => ({ ...subject }));
      plans.set(profile, plan);
    }
    return plan;
  }
  const subjects = useSyncExternalStore(subscribe, getSnapshot, () => empty);
  function replacePlan(next: readonly Subject[]) {
    if (!profile) return;
    plans.set(profile, next.map((subject) => ({ ...subject })));
    listeners.forEach((listener) => listener());
  }
  function setGrade(id: string, grade: Grade | null) {
    replacePlan(getSnapshot().map((subject) => subject.id === id ? { ...subject, grade } : subject));
  }
  return { session, catalog, subjects, setGrade, replacePlan };
}
