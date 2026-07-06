import { Sparkles } from "lucide-react";
import type { Insight } from "@/lib/health";

// Dashboard card: automatic suggestions derived from real guest activity.
export default function InsightsCard({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <section className="card card-hover fade-in border-gold/40 bg-gradient-to-br from-white to-gold/5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-gold" />
        <h2 className="font-display text-xl">GuestFlow AI Insights</h2>
      </div>
      <ul className="mt-4 space-y-3">
        {insights.map((ins) => (
          <li key={ins.id} className="rounded-xl bg-white/70 px-4 py-3 shadow-soft">
            <p className="text-sm">{ins.text}</p>
            {ins.actionLabel && (
              <p className="mt-1 text-xs font-medium text-aegean">→ {ins.actionLabel}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
