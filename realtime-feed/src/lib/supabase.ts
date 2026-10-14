import { createClient } from "@supabase/supabase-js";

export const sampleMode = import.meta.env.VITE_GUESTBOOK_MODE === "sample";
export function createGuestbookClient() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (sampleMode || !url || !key) return null;
  try {
    const parsed = new URL(url);
    if (
      !["https:", "http:"].includes(parsed.protocol) ||
      key.startsWith("sb_secret_")
    )
      return null;
    // Only a publishable key belongs here. Never accept a legacy service-role JWT.
    if (key.split(".").length === 3) {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.role !== "anon") return null;
    } else if (!key.startsWith("sb_publishable_")) return null;
    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  } catch {
    return null;
  }
}
export const guestbookClient = createGuestbookClient();
