"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useToast } from "@/components/Toast";

// Seeds the "Sunset Villa Santorini" demo property for the signed-in owner.
export default function LoadDemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function loadDemo() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/demo", { method: "POST" });
    if (!res.ok) {
      setError("Δεν ήταν δυνατή η φόρτωση του demo. Δοκιμάστε ξανά.");
      setLoading(false);
      return;
    }
    toast.success("Το demo κατάλυμα φορτώθηκε! 🎉");
    router.refresh();
  }

  return (
    <div>
      <button onClick={loadDemo} disabled={loading} className="btn-secondary">
        <Sparkles className="h-4 w-4 text-gold" />
        {loading ? "Φόρτωση…" : "Φόρτωσε demo κατάλυμα"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
