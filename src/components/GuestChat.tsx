"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Wifi, LogOut, Car, UtensilsCrossed, Waves, LifeBuoy, Sparkles } from "lucide-react";
import { GUEST_STRINGS, type GuestLang } from "@/lib/i18n";

interface Msg {
  role: "guest" | "assistant";
  content: string;
  requestCreated?: boolean;
}

// The guest-facing chat. Mobile-first premium concierge UI.
// NOTE: only the presentation was redesigned — session handling, sending,
// language detection and quick-button filtering are unchanged.
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
  welcomeMessage?: string;
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
  const visibleQuickButtons = quickButtons
    ? allQuickButtons.filter((b) => quickButtons.includes(b.key))
    : allQuickButtons;

  const showQuickCards = messages.length === 0;

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col bg-shore">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-sea to-aegean-deep px-5 pb-5 pt-6 text-shore">
        {/* subtle decorative sun */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-shore/60">
              <Sparkles className="h-3 w-3 text-gold" /> Digital Concierge
            </div>
            <h1 className="mt-1 truncate font-display text-2xl leading-tight">{name}</h1>
            {area && <p className="mt-0.5 text-sm text-shore/70">{area}</p>}
          </div>
          {supported.length > 1 && (
            <div className="flex shrink-0 rounded-full border border-shore/25 bg-white/5 p-0.5" role="group" aria-label={t.languageLabel}>
              {supported.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    lang === l ? "bg-gold text-sea" : "text-shore/70 hover:text-shore"
                  }`}
                >
                  {l === "el" ? "ΕΛ" : "EN"}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {/* Welcome bubble */}
        <div className="flex items-end gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sea text-gold">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="w-fit max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-sm shadow-soft">
            {welcomeMessage.trim() || t.greeting}
          </div>
        </div>

        {/* Quick-action cards (only before the first message) */}
        {showQuickCards && (
          <div className="fade-in grid grid-cols-2 gap-2 pt-2">
            {visibleQuickButtons.map(({ key, icon: Icon, label, question }) => (
              <button
                key={key}
                onClick={() => send(question)}
                disabled={sending || !sessionId}
                className="group flex items-center gap-2.5 rounded-2xl border border-sea/10 bg-white px-3.5 py-3 text-left text-sm font-medium text-sea shadow-soft transition-all hover:-translate-y-0.5 hover:border-aegean/30 hover:shadow-lift disabled:opacity-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foam text-aegean transition-colors group-hover:bg-aegean group-hover:text-white">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="fade-in">
            {m.role === "assistant" ? (
              <div className="flex items-end gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sea text-gold">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="w-fit max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-sm shadow-soft">
                  {m.content}
                </div>
              </div>
            ) : (
              <div className="w-fit max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-sm bg-aegean px-4 py-2.5 text-sm text-white shadow-soft ml-auto">
                {m.content}
              </div>
            )}
            {m.requestCreated && (
              <p className="mt-1 flex items-center gap-1 pl-9 text-xs font-medium text-green-700">
                ✓ {t.requestCreated}
              </p>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex items-end gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sea text-gold">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-soft">
              <span className="h-2 w-2 animate-bounce rounded-full bg-sea/30 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-sea/30 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-sea/30" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick buttons row (after conversation starts) */}
      {!showQuickCards && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {visibleQuickButtons.map(({ key, icon: Icon, label, question }) => (
            <button
              key={key}
              onClick={() => send(question)}
              disabled={sending || !sessionId}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-sea/15 bg-white px-4 py-2 text-sm text-sea/80 shadow-soft transition-all hover:border-aegean hover:text-aegean disabled:opacity-50"
            >
              <Icon className="h-4 w-4 text-aegean" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-sea/10 bg-white px-4 py-3">
        <input
          className="flex-1 rounded-full border border-sea/15 bg-sand/50 px-4 py-2.5 text-sea transition-colors placeholder:text-sea/40 focus:border-aegean focus:bg-white"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
        />
        <button
          onClick={() => send(input)}
          disabled={sending || !input.trim() || !sessionId}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-aegean text-white shadow-soft transition-all hover:bg-aegean-deep active:scale-95 disabled:opacity-40"
          aria-label={t.send}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
