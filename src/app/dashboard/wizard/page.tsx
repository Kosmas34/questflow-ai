"use client";

// AI Setup Wizard — premium onboarding:
// 1. Property  2. Paste Info  3. AI Analysis  4. Review  5. Ready
// The owner pastes their existing welcome message / listing description,
// the AI extracts a structured knowledge base, the owner reviews & edits,
// and one click creates everything (property, knowledge, welcome, QR).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Plus, Trash2,
  Wand2, LayoutDashboard, QrCode, Loader2, Lightbulb,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { uniqueSlug } from "@/lib/slug";
import {
  KNOWLEDGE_CATEGORY_LABELS, PROPERTY_TYPE_LABELS,
  type KnowledgeCategory, type PropertyType,
} from "@/lib/types";
import type { WizardExtraction, WizardItem, WizardSuggestion, QuickButtonKey } from "@/lib/wizard/parse";
import { ALL_QUICK_BUTTONS } from "@/lib/wizard/parse";

const STEPS = ["Κατάλυμα", "Επικόλληση", "AI Ανάλυση", "Έλεγχος", "Έτοιμο"];

const QUICK_BUTTON_LABELS: Record<QuickButtonKey, string> = {
  wifi: "WiFi",
  checkout: "Check-out",
  taxi: "Ταξί",
  restaurants: "Εστιατόρια",
  beaches: "Παραλίες",
  help: "Χρειάζομαι βοήθεια",
};

const PLACEHOLDER_TEXT = `Κάντε επικόλληση εδώ ό,τι στέλνετε ήδη στους επισκέπτες σας…

Παράδειγμα:
Welcome to Sunset Villa!
Check-in: 15:00, Checkout: 11:00
WiFi: SunsetVilla / Password: 12345678
Parking is free on the street.
Please don't smoke inside.
The nearest beach is 400m away.
Taxi: +30 22860 71666`;

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 — property basics
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("airbnb");
  const [area, setArea] = useState("");
  const [languages, setLanguages] = useState<string[]>(["el", "en"]);

  // Step 2 — pasted text
  const [pasted, setPasted] = useState("");

  // Step 3/4 — analysis result (editable in review)
  const [extraction, setExtraction] = useState<WizardExtraction | null>(null);
  const [suggestions, setSuggestions] = useState<WizardSuggestion[]>([]);
  const [quickButtons, setQuickButtons] = useState<QuickButtonKey[]>([...ALL_QUICK_BUTTONS]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState(0);
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);

  // Step 5 — created property
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const analysisStarted = useRef(false);

  // ----- Step 3: run the analysis when we enter it -----
  useEffect(() => {
    if (step !== 3 || analysisStarted.current) return;
    analysisStarted.current = true;
    setAnalysisError(null);
    setAnalysisPhase(0);

    // Cosmetic phase ticker while the AI works.
    const ticker = setInterval(() => setAnalysisPhase((p) => Math.min(p + 1, 3)), 1200);

    fetch("/api/wizard/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pasted, propertyName: name, area }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Η ανάλυση απέτυχε.");
        setExtraction(data.extraction);
        setSuggestions(data.suggestions ?? []);
        setQuickButtons(data.quickButtons ?? [...ALL_QUICK_BUTTONS]);
        setStep(4);
      })
      .catch((err: Error) => setAnalysisError(err.message))
      .finally(() => {
        clearInterval(ticker);
        analysisStarted.current = false;
      });

    return () => clearInterval(ticker);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ----- Review helpers -----
  function setProp<K extends keyof WizardExtraction["property"]>(key: K, value: string) {
    setExtraction((e) => (e ? { ...e, property: { ...e.property, [key]: value } } : e));
  }
  function setItem(index: number, patch: Partial<WizardItem>) {
    setExtraction((e) =>
      e ? { ...e, items: e.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) } : e
    );
  }
  function removeItem(index: number) {
    setExtraction((e) => (e ? { ...e, items: e.items.filter((_, i) => i !== index) } : e));
  }
  function addItem(item: WizardItem) {
    setExtraction((e) => (e ? { ...e, items: [...e.items, item] } : e));
    setSuggestions((s) => s.filter((x) => x.category !== item.category));
  }

  async function handleSuggestion(s: WizardSuggestion) {
    if (s.action === "add") {
      addItem({
        category: s.category,
        title: KNOWLEDGE_CATEGORY_LABELS[s.category],
        content: "",
      });
      return;
    }
    // "generate": AI drafts a template with [placeholders] — owner edits it.
    setSuggestBusy(s.category);
    try {
      const res = await fetch("/api/wizard/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: s.category, area, language: languages[0] ?? "el" }),
      });
      const data = await res.json();
      if (data?.item) addItem(data.item);
    } finally {
      setSuggestBusy(null);
    }
  }

  function toggleQuickButton(key: QuickButtonKey) {
    setQuickButtons((qb) =>
      qb.includes(key) ? qb.filter((k) => k !== key) : [...qb, key]
    );
  }

  // ----- Finish: create everything -----
  async function finish() {
    if (!extraction) return;
    setFinishing(true);
    setFinishError(null);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setFinishError("Η συνεδρία έληξε. Συνδεθείτε ξανά.");
      setFinishing(false);
      return;
    }

    const p = extraction.property;
    const { data: created, error } = await supabase
      .from("properties")
      .insert({
        owner_id: user.id,
        name: name || p.name || "Το κατάλυμά μου",
        slug: uniqueSlug(name || p.name || "property"),
        type,
        area: area || p.area,
        languages,
        checkin_time: p.checkin_time,
        checkout_time: p.checkout_time,
        wifi_name: p.wifi_name,
        wifi_password: p.wifi_password,
        house_rules: p.house_rules,
        access_instructions: p.access_instructions,
        phone: p.phone,
        emergency_contact: p.emergency_contact,
        welcome_message: extraction.welcome_message,
        quick_buttons: quickButtons,
      })
      .select("id")
      .single();

    if (error || !created) {
      setFinishError(error?.message ?? "Η δημιουργία απέτυχε.");
      setFinishing(false);
      return;
    }

    const itemsToInsert = extraction.items
      .filter((it) => it.title.trim() && it.content.trim())
      .map((it) => ({ property_id: created.id, ...it }));

    if (itemsToInsert.length > 0) {
      const { error: kbError } = await supabase.from("knowledge_items").insert(itemsToInsert);
      if (kbError) {
        // Property exists; report but continue to success (owner can add manually).
        console.error("Knowledge insert failed:", kbError.message);
      }
    }

    setCreatedId(created.id);
    setFinishing(false);
    setStep(5);
  }

  // =============================================================
  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-gold/20 p-2">
          <Wand2 className="h-5 w-5 text-gold" />
        </span>
        <div>
          <h1 className="font-display text-3xl">AI Setup Wizard</h1>
          <p className="text-sm text-sea/60">
            Το GuestFlow σας, έτοιμο σε λιγότερο από 5 λεπτά.
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <ol className="mt-8 flex items-center" aria-label="Πρόοδος">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                    done
                      ? "border-aegean bg-aegean text-white"
                      : active
                        ? "border-aegean bg-white text-aegean"
                        : "border-sea/20 bg-white text-sea/40"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : n}
                </span>
                <span
                  className={`mt-1.5 hidden text-xs sm:block ${
                    active ? "font-medium text-sea" : "text-sea/50"
                  }`}
                >
                  {label}
                </span>
              </div>
              {n < STEPS.length && (
                <div
                  className={`mx-2 mb-5 h-0.5 flex-1 rounded sm:mb-0 ${
                    done ? "bg-aegean" : "bg-sea/15"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* ================= STEP 1 — Property ================= */}
      {step === 1 && (
        <div className="card mt-8">
          <h2 className="font-display text-xl">Στοιχεία καταλύματος</h2>
          <p className="mt-1 text-sm text-sea/60">
            Μόνο τα βασικά — όλα τα υπόλοιπα θα τα βρει το AI στο επόμενο βήμα.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="w-name">Όνομα καταλύματος *</label>
              <input id="w-name" className="field" value={name}
                onChange={(e) => setName(e.target.value)} placeholder="π.χ. Sunset Villa" autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="w-type">Τύπος</label>
              <select id="w-type" className="field" value={type}
                onChange={(e) => setType(e.target.value as PropertyType)}>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="w-area">Περιοχή</label>
              <input id="w-area" className="field" value={area}
                onChange={(e) => setArea(e.target.value)} placeholder="π.χ. Οία, Σαντορίνη" />
            </div>
            <div className="sm:col-span-2">
              <span className="label">Γλώσσες επισκεπτών</span>
              <div className="flex gap-2">
                {[{ code: "el", label: "Ελληνικά" }, { code: "en", label: "English" }].map(({ code, label }) => (
                  <button key={code} type="button"
                    onClick={() => {
                      const has = languages.includes(code);
                      if (has && languages.length === 1) return;
                      setLanguages(has ? languages.filter((l) => l !== code) : [...languages, code]);
                    }}
                    className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                      languages.includes(code)
                        ? "bg-aegean text-white"
                        : "border border-sea/20 text-sea/60 hover:border-aegean"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button onClick={() => setStep(2)} disabled={!name.trim()} className="btn-primary">
              Συνέχεια <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2 — Paste ================= */}
      {step === 2 && (
        <div className="card mt-8">
          <h2 className="font-display text-xl">Επικολλήστε ό,τι έχετε ήδη</h2>
          <p className="mt-1 text-sm text-sea/60">
            Το μήνυμα καλωσορίσματος που στέλνετε, η περιγραφή από Airbnb/Booking,
            οι σημειώσεις σας — όλα μαζί, όπως είναι. Το AI θα τα οργανώσει.
          </p>
          <textarea
            className="field mt-5 min-h-64 font-mono text-sm"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={PLACEHOLDER_TEXT}
            autoFocus
          />
          <p className="mt-2 text-right text-xs text-sea/40">{pasted.length} χαρακτήρες</p>
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep(1)} className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Πίσω
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={pasted.trim().length < 20}
              className="btn-primary"
            >
              <Sparkles className="h-4 w-4" /> Generate Knowledge Base
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3 — Analysis ================= */}
      {step === 3 && (
        <div className="card mt-8 text-center">
          {!analysisError ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-aegean" />
              <h2 className="mt-5 font-display text-xl">Το AI αναλύει το κείμενό σας…</h2>
              <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm">
                {["Ανάγνωση κειμένου", "Εξαγωγή πληροφοριών", "Οργάνωση σε κατηγορίες", "Σύνταξη καλωσορίσματος"].map(
                  (phase, i) => (
                    <li key={phase} className={`flex items-center gap-2 transition-opacity ${
                      i <= analysisPhase ? "opacity-100" : "opacity-30"
                    }`}>
                      {i < analysisPhase ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Loader2 className={`h-4 w-4 ${i === analysisPhase ? "animate-spin text-aegean" : "text-sea/30"}`} />
                      )}
                      {phase}
                    </li>
                  )
                )}
              </ul>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl text-red-700">Η ανάλυση απέτυχε</h2>
              <p className="mt-2 text-sm text-sea/70">{analysisError}</p>
              <div className="mt-6 flex justify-center gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary">
                  <ArrowLeft className="h-4 w-4" /> Πίσω
                </button>
                <button onClick={() => { setAnalysisError(null); analysisStarted.current = false; setStep(3); setAnalysisPhase(0); }} className="btn-primary">
                  Δοκιμή ξανά
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= STEP 4 — Review ================= */}
      {step === 4 && extraction && (
        <div className="mt-8 space-y-6">
          {/* AI suggestions for missing info */}
          {suggestions.length > 0 && (
            <div className="card border-gold/50 bg-gold/5">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-gold" />
                <h2 className="font-display text-lg">Προτάσεις</h2>
              </div>
              <ul className="mt-3 space-y-2">
                {suggestions.map((s) => (
                  <li key={s.category} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-sea/80">
                      {s.action === "generate"
                        ? `Δεν υπάρχουν ${s.label.toLowerCase()}.`
                        : `Παρατήρησα ότι δεν υπάρχει πληροφορία για ${s.label}.`}
                    </span>
                    <button
                      onClick={() => handleSuggestion(s)}
                      disabled={suggestBusy !== null}
                      className="btn-secondary px-3 py-1 text-xs"
                    >
                      {suggestBusy === s.category ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : s.action === "generate" ? (
                        <><Sparkles className="h-3.5 w-3.5 text-gold" /> Generate Suggestions</>
                      ) : (
                        <><Plus className="h-3.5 w-3.5" /> Προσθήκη {s.label}</>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted property fields */}
          <div className="card">
            <h2 className="font-display text-xl">Στοιχεία που εντοπίστηκαν</h2>
            <p className="mt-1 text-sm text-sea/60">Ελέγξτε και διορθώστε ό,τι χρειάζεται.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="r-checkin">Check-in</label>
                <input id="r-checkin" type="time" className="field" value={extraction.property.checkin_time}
                  onChange={(e) => setProp("checkin_time", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="r-checkout">Check-out</label>
                <input id="r-checkout" type="time" className="field" value={extraction.property.checkout_time}
                  onChange={(e) => setProp("checkout_time", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="r-wifi">Όνομα WiFi</label>
                <input id="r-wifi" className="field" value={extraction.property.wifi_name}
                  onChange={(e) => setProp("wifi_name", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="r-wifipass">Κωδικός WiFi</label>
                <input id="r-wifipass" className="field" value={extraction.property.wifi_password}
                  onChange={(e) => setProp("wifi_password", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="r-phone">Τηλέφωνο</label>
                <input id="r-phone" className="field" value={extraction.property.phone}
                  onChange={(e) => setProp("phone", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="r-emergency">Emergency contact</label>
                <input id="r-emergency" className="field" value={extraction.property.emergency_contact}
                  onChange={(e) => setProp("emergency_contact", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="r-rules">Κανόνες σπιτιού</label>
                <textarea id="r-rules" className="field min-h-20" value={extraction.property.house_rules}
                  onChange={(e) => setProp("house_rules", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="r-access">Οδηγίες πρόσβασης</label>
                <textarea id="r-access" className="field min-h-20" value={extraction.property.access_instructions}
                  onChange={(e) => setProp("access_instructions", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Welcome message */}
          <div className="card">
            <h2 className="font-display text-xl">Μήνυμα καλωσορίσματος</h2>
            <p className="mt-1 text-sm text-sea/60">
              Το πρώτο μήνυμα που βλέπει ο επισκέπτης στο chat.
            </p>
            <textarea
              className="field mt-4 min-h-20"
              value={extraction.welcome_message}
              onChange={(e) => setExtraction((ex) => (ex ? { ...ex, welcome_message: e.target.value } : ex))}
              placeholder="π.χ. Καλώς ήρθατε στη βίλα μας! Είμαι εδώ για ό,τι χρειαστείτε."
            />
          </div>

          {/* Knowledge items */}
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">
                Βάση γνώσης <span className="text-sm font-normal text-sea/50">({extraction.items.length})</span>
              </h2>
              <button
                onClick={() => addItem({ category: "faq", title: "", content: "" })}
                className="btn-secondary px-3 py-1.5 text-sm"
              >
                <Plus className="h-4 w-4" /> Προσθήκη
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {extraction.items.length === 0 && (
                <p className="text-sm text-sea/60">
                  Δεν εντοπίστηκαν πληροφορίες — προσθέστε τουλάχιστον το WiFi και 1-2 προτάσεις.
                </p>
              )}
              {extraction.items.map((item, i) => (
                <div key={i} className="rounded-xl border border-sea/10 bg-sand/40 p-4">
                  <div className="flex flex-wrap gap-3">
                    <select
                      className="field w-auto py-1.5 text-sm"
                      value={item.category}
                      onChange={(e) => setItem(i, { category: e.target.value as KnowledgeCategory })}
                      aria-label="Κατηγορία"
                    >
                      {Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <input
                      className="field flex-1 py-1.5 text-sm font-medium"
                      value={item.title}
                      onChange={(e) => setItem(i, { title: e.target.value })}
                      placeholder="Τίτλος"
                      aria-label="Τίτλος"
                    />
                    <button
                      onClick={() => removeItem(i)}
                      className="rounded-full p-2 text-sea/40 hover:bg-red-50 hover:text-red-600"
                      title="Διαγραφή"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    className="field mt-3 min-h-16 text-sm"
                    value={item.content}
                    onChange={(e) => setItem(i, { content: e.target.value })}
                    placeholder="Πληροφορία…"
                    aria-label="Πληροφορία"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick buttons */}
          <div className="card">
            <h2 className="font-display text-xl">Quick buttons επισκέπτη</h2>
            <p className="mt-1 text-sm text-sea/60">
              Τα κουμπιά γρήγορων ερωτήσεων στη σελίδα του επισκέπτη.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ALL_QUICK_BUTTONS.map((key) => (
                <button
                  key={key}
                  onClick={() => toggleQuickButton(key)}
                  className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                    quickButtons.includes(key)
                      ? "bg-aegean text-white"
                      : "border border-sea/20 text-sea/50 hover:border-aegean"
                  }`}
                >
                  {QUICK_BUTTON_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {finishError && <p className="text-sm text-red-600">{finishError}</p>}

          <div className="flex items-center justify-between pb-8">
            <button onClick={() => setStep(2)} className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Πίσω
            </button>
            <button onClick={finish} disabled={finishing} className="btn-primary">
              {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Finish
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 5 — Ready ================= */}
      {step === 5 && createdId && (
        <div className="card mt-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </span>
          <h2 className="mt-5 font-display text-2xl">✅ GuestFlow is ready!</h2>
          <p className="mt-2 text-sea/60">Δημιουργήθηκαν:</p>
          <ul className="mx-auto mt-4 w-fit space-y-1.5 text-left text-sm">
            {["Knowledge Base", "FAQ", "Quick Actions", "Guest Welcome Message", "QR Code"].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" /> {x}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => { router.push("/dashboard"); router.refresh(); }}
              className="btn-primary"
            >
              <LayoutDashboard className="h-4 w-4" /> Open Dashboard
            </button>
            <Link href={`/dashboard/properties/${createdId}`} className="btn-secondary">
              <QrCode className="h-4 w-4" /> Κατάλυμα & QR
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
