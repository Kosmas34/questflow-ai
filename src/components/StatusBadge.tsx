// Consistent status/priority badges across requests and property pages.
import type { RequestStatus } from "@/lib/types";

const STATUS_STYLES: Record<RequestStatus, string> = {
  new: "bg-gold/20 text-yellow-800 ring-gold/30",
  in_progress: "bg-foam text-aegean ring-aegean/20",
  done: "bg-green-100 text-green-700 ring-green-600/20",
};

const STATUS_DOT: Record<RequestStatus, string> = {
  new: "bg-gold",
  in_progress: "bg-aegean",
  done: "bg-green-600",
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "Νέο",
  in_progress: "Σε εξέλιξη",
  done: "Ολοκληρώθηκε",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

// Generic pill for tone-based labels (e.g. "AI Assistant Active").
export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "info" | "gold";
}) {
  const tones = {
    neutral: "bg-sand text-sea/70 ring-sea/10",
    success: "bg-green-100 text-green-700 ring-green-600/20",
    info: "bg-foam text-aegean ring-aegean/20",
    gold: "bg-gold/20 text-yellow-800 ring-gold/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}
