export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY в .env.local.");
  }
  const endpoint = new URL(url);
  if (!["https:", "http:"].includes(endpoint.protocol)) throw new Error("Неверный URL Supabase.");
  return { url: endpoint.href.replace(/\/$/, ""), publishableKey };
}
