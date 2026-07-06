// Simple horizontal bar for analytics — no chart library needed.
export default function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-sm text-sea/80">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-sand">
        <div className="h-full rounded-full bg-aegean" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-medium">{value}</span>
    </div>
  );
}
