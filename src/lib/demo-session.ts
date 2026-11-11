"use client";

import { useMemo, useSyncExternalStore } from "react";
import { createBrowserStore } from "./browser-store";

export type DemoRole = "student" | "moderator" | "admin";
export type DemoProfile = {
  firstName: string;
  lastName: string;
  universityId: string;
  groupId: string;
};
type DemoAccount = { email: string; role: DemoRole };
export type DemoSession = DemoAccount & { profile: DemoProfile | null };
type DemoState = { active: DemoAccount | null; profiles: Record<string, DemoProfile> };

export const demoRoleLabels: Record<DemoRole, string> = {
  student: "Студент",
  moderator: "Модератор",
  admin: "Администратор",
};

export const defaultDemoEmail = "student@example.com";
const storageKey = "scholarpath.demo-session.v2";
const store = createBrowserStore<DemoState>(storageKey, { active: null, profiles: {} }, parseState, {
  legacy: { key: "scholarpath.demo-session.v1", parse: parseLegacySession },
});

function isRole(value: unknown): value is DemoRole {
  return typeof value === "string" && Object.hasOwn(demoRoleLabels, value);
}

function isProfile(value: unknown): value is DemoProfile {
  if (!value || typeof value !== "object") return false;
  const { firstName, lastName, universityId, groupId } = value as Partial<DemoProfile>;
  return [firstName, lastName, universityId, groupId].every((field) => typeof field === "string" && field.trim());
}

function parseState(raw: string): DemoState | null {
  try {
    const saved = JSON.parse(raw) as Partial<DemoState> | null;
    if (!saved?.profiles || typeof saved.profiles !== "object" || Array.isArray(saved.profiles)) return null;
    const profiles = Object.fromEntries(Object.entries(saved.profiles).filter(([, profile]) => isProfile(profile)));
    const active = saved.active;
    return { profiles, active: active && isRole(active.role) && typeof active.email === "string" && active.email ? active : null };
  } catch {
    return null;
  }
}

function parseLegacySession(raw: string): DemoState | null {
  try {
    const legacy = JSON.parse(raw) as Partial<DemoSession> | null;
    if (!legacy || !isRole(legacy.role)) return null;
    return {
      active: { email: defaultDemoEmail, role: legacy.role },
      profiles: isProfile(legacy.profile) ? { [defaultDemoEmail]: legacy.profile } : {},
    };
  } catch {
    return null;
  }
}

export function useDemoSession() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, () => undefined);
  return useMemo<DemoSession | null | undefined>(() => {
    if (!state) return undefined;
    const { active, profiles } = state;
    if (!active) return null;
    const profile = Object.hasOwn(profiles, active.email) ? profiles[active.email] : null;
    return { ...active, profile };
  }, [state]);
}

export function startDemoSession(role: DemoRole, email = defaultDemoEmail) {
  store.update((state) => ({ ...state, active: { role, email: email.trim().toLowerCase() || defaultDemoEmail } }));
}

export function endDemoSession() {
  store.update((state) => ({ ...state, active: null }));
}

export function saveDemoProfile(email: string, profile: DemoProfile) {
  let saved = false;
  store.update((state) => {
    if (state.active?.email !== email) return state;
    saved = true;
    return { ...state, profiles: { ...state.profiles, [email]: profile } };
  });
  return saved;
}
