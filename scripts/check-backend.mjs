import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key, "Заполните .env.local по примеру .env.example");
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
});
const health = await supabase.rpc("backend_health");
assert.ifError(health.error);
assert.equal(health.data, "scholarpath-v1");
const catalogue = await supabase.from("universities").select("id");
assert.ok(catalogue.error || catalogue.data.length === 0, "Аноним получил каталог без входа");
const profiles = await supabase.from("profiles").select("id");
assert.ok(profiles.error || profiles.data.length === 0, "Аноним получил профили без входа");
console.log("PASS: соединение с PostgreSQL, версия схемы и отсутствие анонимного доступа к данным.");
