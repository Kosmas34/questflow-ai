import Link from "next/link";
import { Sparkles } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";
import SidebarNav from "@/components/SidebarNav";
import { ToastProvider } from "@/components/Toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (top bar on mobile) */}
      <aside className="flex items-center justify-between gap-4 border-b border-white/5 bg-sea-gradient px-4 py-3 text-shore md:min-h-screen md:w-60 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:px-4 md:py-7">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-xl tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/90 text-sea">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">GuestFlow</span>
        </Link>
        <SidebarNav />
        <div className="md:mt-auto">
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 bg-shore px-4 py-8 md:px-10">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
}
