"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Wifi, LogOut, Car, UtensilsCrossed, Waves, LifeBuoy } from "lucide-react";
import { GUEST_STRINGS, type GuestLang } from "@/lib/i18n";

interface Msg {
  role: "guest" | "assistant";
  content: string;
  requestCreated?: boolean;
}

// The guest-facing chat. Mobile-first: full-height layout, big touch
// targets, quick buttons for the questions every guest asks.
export default function GuestChat({
  slug,
  name,
  area,
  languages,
  welcomeMessage = "",
  quickButtons = null,
}: {
  slug: string;
  name: string;
  area: string;
  languages: string[];
  /** Custom first bubble from the owner (wizard). Falls back to default greeting. */
  welcomeMessage?: string;
  /** Which quick buttons to show (wizard). null = all (backwards compatible). */
  quickButtons?: string[] | null;
}) {
  const supported = (["el", "en"] as GuestLang[]).filter((l) => languages.includes(l));
  const defaultLang: GuestLang = supported[0] ?? "el";

  const [lang, setLang] = useState<GuestLang>(defaultLang);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const t = GUEST_STRINGS[lang];

  // On first load: detect the browser language (Greek browser → Greek,
  // otherwise English), then create the guest session with it.
  // Runs in useEffect (client only) to avoid SSR hydration mismatches.
  // The guest can always switch manually with the header buttons.
  useEffect(() => {
    let detected: GuestLang = defaultLang;
    const nav = navigator.language?.toLowerCase() ?? "";
    if (nav.startsWith("el") && supported.includes("el")) detected = "el";
    else if (supported.includes("en")) detected = "en";
    setLang(detected);

    fetch("/api/guest/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, language: detected }),
    })
      .then((r) => r.json())
      .then((d) => setSessionId(d.sessionId ?? null))
      .catch(() => setSessionId(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending || !sessionId) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "guest", content: message }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/guest/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, sessionId, message, language: lang, history }),
      });
      if (!res.ok) throw new Error("chat failed");
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer, requestCreated: data.requestCreated },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: t.errorGeneric }]);
    } finally {
      setSending(false);
    }
  }

  const allQuickButtons = [
    { key: "wifi", icon: Wifi, label: t.quickWifi, question: t.qWifi },
    { key: "checkout", icon: LogOut, label: t.quickCheckout, question: t.qCheckout },
    { key: "taxi", icon: Car, label: t.quickTaxi, question: t.qTaxi },
    { key: "restaurants", icon: UtensilsCrossed, label: t.quickRestaurants, question: t.qRestaurants },
    { key: "beaches", icon: Waves, label: t.quickBeaches, question: t.qBeaches },
    { key: "help", icon: LifeBuoy, label: t.quickHelp, question: t.qHelp },
  ];
  // The wizard lets owners choose which buttons appear; older properties
  // (quickButtons = null) keep showing all of them.
  const visibleQuickButtons = quickButtons
    ? allQuickButtons.filter((b) => quickButtons.includes(b.key))
    : allQuickButtons;

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col bg-shore">
      {/* Header */}
      <header className="bg-sea px-5 pb-4 pt-5 text-shore">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl leading-tight">{name}</h1>
            {area && <p className="mt-0.5 text-sm text-shore/70">{area}</p>}
          </div>
          {supported.length > 1 && (
            <div className="flex rounded-full border border-shore/25 p-0.5" role="group" aria-label={t.languageLabel}>
              {supported.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    lang === l ? "bg-gold text-sea" : "text-shore/70"
                  }`}
                >
                  {l === "el" ? "ΕΛ" : "EN"}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-shore/60">{t.tagline}</p>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="w-fit max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-foam px-4 py-2.5 text-sm">
          {welcomeMessage.trim() || t.greeting}
        </div>
        {messages.map((m, i) => (
          <div key={i}>
            <div
              className={`w-fit max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "guest"
                  ? "ml-auto rounded-br-sm bg-aegean text-white"
                  : "rounded-bl-sm bg-foam"
              }`}
            >
              {m.content}
            </div>
            {m.requestCreated && (
              <p className="mt-1 text-xs font-medium text-green-700">{t.requestCreated}</p>
            )}
          </div>
        ))}
        {sending && (
          <div className="w-fit rounded-2xl rounded-bl-sm bg-foam px-4 py-2.5 text-sm text-sea/50">
            {t.thinking}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick buttons */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {visibleQuickButtons.map(({ key, icon: Icon, label, question }) => (
          <button
            key={key}
            onClick={() => send(question)}
            disabled={sending || !sessionId}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-sea/15 bg-white px-4 py-2 text-sm text-sea/80 transition-colors hover:border-aegean hover:text-aegean disabled:opacity-50"
          >
            <Icon className="h-4 w-4 text-aegean" />
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-sea/10 bg-white px-4 py-3">
        <input
          className="field flex-1 border-0 bg-sand/60"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
        />
        <button
          onClick={() => send(input)}
          disabled={sending || !input.trim() || !sessionId}
          className="rounded-full bg-aegean p-3 text-white transition-colors hover:bg-aegean-deep disabled:opacity-40"
          aria-label={t.send}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
