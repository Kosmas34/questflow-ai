"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-shore/70 transition-colors hover:bg-white/10 hover:text-shore"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden md:inline">Αποσύνδεση</span>
    </button>
  );
}
