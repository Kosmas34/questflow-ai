// Small stat tile used on the dashboard overview and analytics pages.
import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "info" | "gold" | "success";
}) {
  const iconTones = {
    neutral: "bg-sand text-sea/60",
    info: "bg-foam text-aegean",
    gold: "bg-gold/20 text-yellow-700",
    success: "bg-green-100 text-green-700",
  };
  return (
    <div className="card card-hover fade-in relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-sea/55">{label}</p>
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${iconTones[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-sea/45">{hint}</p>}
    </div>
  );
}
