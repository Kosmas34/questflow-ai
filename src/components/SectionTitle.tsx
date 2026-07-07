// Small uppercase section label used inside cards and tab panels.
export default function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-xs font-semibold uppercase tracking-wider text-sea/45 ${className}`}>
      {children}
    </h3>
  );
}
