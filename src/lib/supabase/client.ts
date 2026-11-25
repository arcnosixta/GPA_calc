"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "./config";

export function createBrowserSupabaseClient() {
  const { url, publishableKey } = getSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
