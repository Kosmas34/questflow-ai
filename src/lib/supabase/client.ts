"use client";
import { createBrowserClient } from "@supabase/ssr";

// Browser client — used in client components (login form, dashboard mutations).
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
