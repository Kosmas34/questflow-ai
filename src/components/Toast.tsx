"use client";

// Lightweight toast system — no external deps.
// Usage: const toast = useToast(); toast.success("Αποθηκεύτηκε");

import { createContext, useCallback, useContext, useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";

interface ToastItem {
  id: number;
  kind: "success" | "error";
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  // Graceful no-op outside the provider (e.g. guest page) so components
  // can call useToast() unconditionally.
  return ctx ?? { success: () => {}, error: () => {} };
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastItem["kind"], message: string) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const api: ToastApi = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-enter pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lift ${
              t.kind === "success" ? "bg-sea text-shore" : "bg-red-600 text-white"
            }`}
          >
            {t.kind === "success" ? (
              <Check className="h-4 w-4 shrink-0 text-gold" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
              className="rounded-full p-1 opacity-60 hover:opacity-100"
              aria-label="Κλείσιμο"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
