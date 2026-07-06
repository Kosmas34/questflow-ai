import Link from "next/link";
import { HeartPulse, ArrowRight } from "lucide-react";
import type { KnowledgeHealth } from "@/lib/health";

// Dashboard widget: per-property knowledge completeness.
export default function KnowledgeHealthCard({
  entries,
}: {
  entries: { propertyId: string; propertyName: string; health: KnowledgeHealth }[];
}) {
  return (
    <section className="card card-hover fade-in">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-5 w-5 text-aegean" />
        <h2 className="font-display text-xl">Knowledge Health</h2>
      </div>

      <div className="mt-5 space-y-6">
        {entries.map(({ propertyId, propertyName, health }) => (
          <div key={propertyId}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-medium">{propertyName}</p>
              <p className="font-display text-2xl">
                {health.percent}
                <span className="text-sm text-sea/50">%</span>
              </p>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sand">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  health.percent >= 80 ? "bg-green-500" : health.percent >= 50 ? "bg-gold" : "bg-red-400"
                }`}
                style={{ width: `${health.percent}%` }}
              />
            </div>

            {health.missing.length > 0 && (
              <>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-sea/50">
                  Λείπουν
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {health.missing.map((m) => (
                    <span
                      key={m.key}
                      className="rounded-full border border-sea/15 bg-sand/60 px-2.5 py-0.5 text-xs text-sea/70"
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/dashboard/properties/${propertyId}`}
                  className="btn-secondary mt-4 px-4 py-1.5 text-sm"
                >
                  Complete Missing Sections <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
            {health.missing.length === 0 && (
              <p className="mt-2 text-xs text-green-700">Πλήρες — εξαιρετική δουλειά. ✓</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
