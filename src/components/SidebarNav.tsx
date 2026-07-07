"use client";

// Sidebar navigation with active-route highlighting.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Bell, BarChart3, type LucideIcon } from "lucide-react";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Επισκόπηση", icon: LayoutDashboard },
  { href: "/dashboard/properties", label: "Καταλύματα", icon: Building2 },
  { href: "/dashboard/requests", label: "Αιτήματα", icon: Bell },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

export default function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 md:mt-8 md:flex-col md:gap-1.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all ${
              active
                ? "bg-white/15 font-medium text-shore shadow-inset"
                : "text-shore/70 hover:bg-white/10 hover:text-shore"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden md:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
