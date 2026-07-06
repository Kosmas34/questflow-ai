"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

// Owner authentication: email + password sign-in / sign-up.
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = supabaseBrowser();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Λάθος email ή κωδικός.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // If email confirmation is disabled in Supabase, a session exists now.
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setInfo("Ελέγξτε το email σας για να επιβεβαιώσετε τον λογαριασμό.");
        setLoading(false);
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sea px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 block text-center font-display text-2xl text-shore">
          GuestFlow AI
        </Link>
        <div className="card">
          <div className="mb-6 flex rounded-full bg-sand p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                  mode === m ? "bg-white text-sea shadow-soft" : "text-sea/60"
                }`}
              >
                {m === "signin" ? "Σύνδεση" : "Εγγραφή"}
              </button>
            ))}
          </div>

          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="field mb-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <label className="label" htmlFor="password">Κωδικός</label>
          <input
            id="password"
            type="password"
            className="field mb-6"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          {info && <p className="mb-4 text-sm text-aegean">{info}</p>}

          <button onClick={handleSubmit} disabled={loading || !email || !password} className="btn-primary w-full">
            {loading ? "Παρακαλώ περιμένετε…" : mode === "signin" ? "Σύνδεση" : "Δημιουργία λογαριασμού"}
          </button>
        </div>
      </div>
    </main>
  );
}
