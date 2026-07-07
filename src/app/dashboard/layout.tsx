import Link from "next/link";
import { LayoutDashboard, Building2, Bell, BarChart3 } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";
import { ToastProvider } from "@/components/Toast";

const NAV = [
  { href: "/dashboard", label: "Επισκόπηση", icon: LayoutDashboard },
  { href: "/dashboard/properties", label: "Καταλύματα", icon: Building2 },
  { href: "/dashboard/requests", label: "Αιτήματα", icon: Bell },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (top bar on mobile) */}
      <aside className="flex items-center justify-between gap-4 border-b border-sea/10 bg-sea px-4 py-3 text-shore md:min-h-screen md:w-60 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:px-5 md:py-8">
        <Link href="/dashboard" className="font-display text-xl">
          GuestFlow AI
        </Link>
        <nav className="flex gap-1 md:mt-8 md:flex-col md:gap-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-shore/80 transition-colors hover:bg-white/10 hover:text-shore"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="md:mt-auto">
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 px-4 py-8 md:px-10">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
}
