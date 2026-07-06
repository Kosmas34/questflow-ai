// Premium empty state with a small Aegean-styled illustration.
export default function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode; // action buttons
}) {
  return (
    <div className="card fade-in flex flex-col items-center px-8 py-14 text-center">
      {/* Illustration: phone scanning a QR by the sea */}
      <svg width="140" height="104" viewBox="0 0 140 104" fill="none" aria-hidden className="mb-6">
        {/* sun */}
        <circle cx="112" cy="22" r="12" fill="#E9B44C" opacity="0.9" />
        {/* waves */}
        <path d="M4 84c10 0 10-6 20-6s10 6 20 6 10-6 20-6 10 6 20 6 10-6 20-6 10 6 20 6" stroke="#1D63A8" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
        <path d="M12 94c10 0 10-6 20-6s10 6 20 6 10-6 20-6 10 6 20 6 10-6 20-6" stroke="#1D63A8" strokeWidth="2.5" strokeLinecap="round" opacity="0.2" />
        {/* phone */}
        <rect x="52" y="10" width="36" height="62" rx="7" fill="#0E2A3B" />
        <rect x="56" y="16" width="28" height="46" rx="3" fill="#FAF8F2" />
        {/* QR blocks */}
        <rect x="60" y="21" width="8" height="8" rx="1.5" fill="#0E2A3B" />
        <rect x="72" y="21" width="8" height="8" rx="1.5" fill="#0E2A3B" />
        <rect x="60" y="33" width="8" height="8" rx="1.5" fill="#0E2A3B" />
        <rect x="73" y="34" width="3.5" height="3.5" fill="#1D63A8" />
        <rect x="77" y="38" width="3.5" height="3.5" fill="#1D63A8" />
        <rect x="73" y="42" width="3.5" height="3.5" fill="#1D63A8" />
        <rect x="60" y="46" width="8" height="3.5" rx="1" fill="#E9B44C" />
        <rect x="60" y="52" width="20" height="3.5" rx="1" fill="#0E2A3B" opacity="0.5" />
        {/* scan beam */}
        <rect x="54" y="27" width="32" height="2" rx="1" fill="#19DF8B" opacity="0.0">
          <animate attributeName="y" values="20;58;20" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.15;0.6" dur="3s" repeatCount="indefinite" />
        </rect>
      </svg>
      <h2 className="font-display text-xl">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm text-sea/60">{description}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
