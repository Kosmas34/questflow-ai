// Consistent page header for all dashboard pages (title + optional
// subtitle + actions). Removes the duplicated header markup.
export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="fade-in flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-xl text-sm text-sea/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
