"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import {
  REQUEST_CATEGORY_LABELS,
  REQUEST_STATUS_LABELS,
  type GuestRequest,
  type RequestStatus,
} from "@/lib/types";

const STATUS_STYLES: Record<RequestStatus, string> = {
  new: "bg-gold/20 text-yellow-800",
  in_progress: "bg-foam text-aegean",
  done: "bg-green-100 text-green-700",
};

// Requests inbox: filter by status, move each request through
// new → in progress → done.
export default function RequestList({
  initialRequests,
  propertyNames,
}: {
  initialRequests: GuestRequest[];
  propertyNames: Record<string, string>;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<"all" | RequestStatus>("all");
  const toast = useToast();

  async function setStatus(id: string, status: RequestStatus) {
    // Optimistic update, revert on failure.
    const prev = requests;
    setRequests((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabaseBrowser()
      .from("requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      setRequests(prev);
      toast.error("Η ενημέρωση απέτυχε. Δοκιμάστε ξανά.");
    } else {
      toast.success(`Το αίτημα σημειώθηκε: ${REQUEST_STATUS_LABELS[status]}`);
    }
  }

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  return (
    <div>
      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "new", "in_progress", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              filter === f ? "bg-sea text-shore" : "border border-sea/20 text-sea/60 hover:border-sea"
            }`}
          >
            {f === "all" ? "Όλα" : REQUEST_STATUS_LABELS[f]}
            <span className="ml-1.5 opacity-60">
              {f === "all" ? requests.length : requests.filter((r) => r.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card mt-6 text-center text-sm text-sea/60">
          Δεν υπάρχουν αιτήματα εδώ.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="card card-hover fade-in py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                      {REQUEST_STATUS_LABELS[r.status]}
                    </span>
                    <span className="text-xs text-sea/50">
                      {REQUEST_CATEGORY_LABELS[r.category] ?? r.category}
                    </span>
                  </div>
                  <p className="mt-2">{r.message}</p>
                  <p className="mt-1 text-xs text-sea/50">
                    {propertyNames[r.property_id] ?? "—"} ·{" "}
                    {new Date(r.created_at).toLocaleString("el-GR")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status !== "in_progress" && r.status !== "done" && (
                    <button onClick={() => setStatus(r.id, "in_progress")} className="btn-secondary px-4 py-1.5 text-sm">
                      Σε εξέλιξη
                    </button>
                  )}
                  {r.status !== "done" && (
                    <button onClick={() => setStatus(r.id, "done")} className="btn-primary px-4 py-1.5 text-sm">
                      Ολοκληρώθηκε
                    </button>
                  )}
                  {r.status === "done" && (
                    <button onClick={() => setStatus(r.id, "new")} className="btn-secondary px-4 py-1.5 text-sm">
                      Επαναφορά
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
