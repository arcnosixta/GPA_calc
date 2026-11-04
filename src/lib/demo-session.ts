"use client";

import { useSyncExternalStore } from "react";

export type DemoRole = "student" | "moderator" | "admin";
export type DemoProfile = {
  firstName: string;
  lastName: string;
  universityId: string;
  groupId: string;
};
export type DemoSession = { role: DemoRole; profile: DemoProfile | null };

export const demoRoleLabels: Record<DemoRole, string> = {
  student: "Студент",
  moderator: "Модератор",
  admin: "Администратор",
};

const storageKey = "scholarpath.demo-session.v1";
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedSession: DemoSession | null = null;
let useMemoryOnly = false;

function parseSession(raw: string | null): DemoSession | null {
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Partial<DemoSession> | null;
    if (!session || typeof session.role !== "string" || !Object.hasOwn(demoRoleLabels, session.role)) return null;
    const profile = session.profile;
    if (profile !== null && (!profile || ![profile.firstName, profile.lastName, profile.universityId, profile.groupId]
      .every((value) => typeof value === "string" && value.trim()))) return null;
    return session as DemoSession;
  } catch {
    return null;
  }
}

function getSession() {
  if (useMemoryOnly) return cachedSession;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSession = parseSession(raw);
    }
  } catch {
    useMemoryOnly = true;
  }
  return cachedSession;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function setSession(session: DemoSession | null) {
  cachedSession = session;
  cachedRaw = session ? JSON.stringify(session) : null;
  try {
    if (cachedRaw === null) window.sessionStorage.removeItem(storageKey);
    else window.sessionStorage.setItem(storageKey, cachedRaw);
  } catch {
    useMemoryOnly = true;
  }
  listeners.forEach((listener) => listener());
}

export function useDemoSession() {
  return useSyncExternalStore(subscribe, getSession, () => undefined);
}

export function startDemoSession(role: DemoRole) {
  setSession({ role, profile: null });
}

export function endDemoSession() {
  setSession(null);
}

export function saveDemoProfile(profile: DemoProfile) {
  const session = getSession();
  if (session) setSession({ ...session, profile });
}
