// A single row in a recent-activity / conversations feed.
import type { LucideIcon } from "lucide-react";

export default function ActivityItem({
  icon: Icon,
  title,
  meta,
  tone = "neutral",
}: {
  icon: LucideIcon;
  title: string;
  meta?: string;
  tone?: "neutral" | "info" | "gold" | "success";
}) {
  const iconTones = {
    neutral: "bg-sand text-sea/60",
    info: "bg-foam text-aegean",
    gold: "bg-gold/20 text-yellow-700",
    success: "bg-green-100 text-green-700",
  };
  return (
    <div className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sand/50">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconTones[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-sea">{title}</p>
        {meta && <p className="mt-0.5 text-xs text-sea/45">{meta}</p>}
      </div>
    </div>
  );
}
