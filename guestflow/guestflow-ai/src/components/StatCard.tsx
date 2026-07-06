// Small stat tile used on the dashboard overview and analytics pages.
export default function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-sm text-sea/60">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-sea/50">{hint}</p>}
    </div>
  );
}
