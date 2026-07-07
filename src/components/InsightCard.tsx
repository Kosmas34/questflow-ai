// Single AI insight row with an optional action label. Used by the
// dashboard AI Insights section and property overview.
import { Sparkles } from "lucide-react";

export default function InsightCard({
  text,
  actionLabel,
}: {
  text: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-white/70 px-4 py-3 shadow-soft ring-1 ring-gold/10">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <div>
        <p className="text-sm text-sea">{text}</p>
        {actionLabel && <p className="mt-1 text-xs font-medium text-aegean">→ {actionLabel}</p>}
      </div>
    </div>
  );
}
