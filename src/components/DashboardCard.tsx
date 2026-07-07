// Reusable content card for the dashboard/property pages.
// Optional title + icon header, optional action slot in the corner.
import type { LucideIcon } from "lucide-react";

export default function DashboardCard({
  title,
  icon: Icon,
  action,
  className = "",
  bodyClassName = "",
  children,
}: {
  title?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`card card-hover fade-in ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-aegean" />}
            {title && <h2 className="font-display text-xl tracking-tight">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
