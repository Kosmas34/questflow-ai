"use client";

// AI Setup Wizard — premium onboarding + Smart Merge import mode.
// 1. Κατάλυμα  2. Επικόλληση  3. AI Ανάλυση  4. Έλεγχος  5. Έτοιμο
// With ?property=<id> the wizard imports INTO an existing property:
// conflicts are shown ("Already Existing Information") and the owner
// decides Replace / Keep / Merge per field and category.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Plus, Trash2, Wand2,
  LayoutDashboard, QrCode, Loader2, Lightbulb, AlertTriangle, GitMerge,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { uniqueSlug } from "@/lib/slug";
import {
  KNOWLEDGE_CATEGORY_LABELS, PROPERTY_TYPE_LABELS,
  type KnowledgeCategory, type PropertyType,
} from "@/lib/types";
import {
  ALL_QUICK_BUTTONS, CONFIDENCE_WARNING_THRESHOLD, computeMergePlan, FIELD_LABELS,
  type CategoryDecision, type FieldDecision, type MergePlan, type PropertyFieldKey,
  type QuickButtonKey, type WizardExtraction, type WizardItem, type WizardSuggestion,
} from "@/lib/wizard/parse";

const STEPS = ["Κατάλυμα", "Επικόλληση", "AI Ανάλυση", "Έλεγχος", "Έτοιμο"];

const ANALYSIS_PHASES = [
  "Ανάλυση καταλύματος…",
  "Εντοπισμός WiFi και check-in…",
  "Δημιουργία FAQ…",
  "Δημιουργία Knowledge Base…",
  "Προετοιμασία QR…",
];

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

// Confidence badge: green ≥90, gold 70-89, red <70.
function ConfidenceBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const tone =
    value >= 90
      ? "bg-green-100 text-green-700"
      : value >= CONFIDENCE_WARNING_THRESHOLD
        ? "bg-gold/20 text-yellow-800"
        : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      {value}%
    </span>
  );
}

function VerifyWarning() {
  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-red-600">
      <AlertTriangle className="h-3.5 w-3.5" /> Please verify this information.
    </p>
  );
}

interface ExistingData {
  property: WizardExtraction["property"] & {
    id: string;
    slug: string;
    type: PropertyType;
    languages: string[];
    welcome_message: string;
    quick_buttons: string[] | null;
  };
  items: { id: string; category: string; title: string; content: string }[];
}

export default function WizardClient({ importPropertyId }: { importPropertyId: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const isImport = !!importPropertyId;

  // Step 1 — property basics
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("airbnb");
  const [area, setArea] = useState("");
  const [languages, setLanguages] = useState<string[]>(["el", "en"]);

  // Import mode: the existing property + its knowledge
  const [existing, setExisting] = useState<ExistingData | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(isImport);

  // Step 2 — pasted text
  const [pasted, setPasted] = useState("");

  // Step 3/4 — analysis result (editable in review)
  const [extraction, setExtraction] = useState<WizardExtraction | null>(null);
  const [suggestions, setSuggestions] = useState<WizardSuggestion[]>([]);
  const [quickButtons, setQuickButtons] = useState<QuickButtonKey[]>([...ALL_QUICK_BUTTONS]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);

  // Smart Merge decisions
  const [mergePlan, setMergePlan] = useState<MergePlan | null>(null);
  const [fieldDecisions, setFieldDecisions] = useState<Record<string, FieldDecision>>({});
  const [categoryDecisions, setCategoryDecisions] = useState<Record<string, CategoryDecision>>({});

  // Step 5 — result
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const analysisStarted = useRef(false);

  // ----- Import mode: load the existing property -----
  useEffect(() => {
    if (!importPropertyId) return;
    const supabase = supabaseBrowser();
    Promise.all([
      supabase.from("properties").select("*").eq("id", importPropertyId).single(),
      supabase
        .from("knowledge_items")
        .select("id, category, title, content")
        .eq("property_id", importPropertyId),
    ]).then(([propRes, itemsRes]) => {
      if (propRes.data) {
        const p = propRes.data;
        setExisting({ property: p, items: itemsRes.data ?? [] });
        setName(p.name);
        setType(p.type);
        setArea(p.area);
        setLanguages(p.languages ?? ["el", "en"]);
      }
      setLoadingExisting(false);
    });
  }, [importPropertyId]);

  // ----- Step 3: run the analysis -----
  useEffect(() => {
    if (step !== 3 || analysisStarted.current) return;
    analysisStarted.current = true;
    setAnalysisError(null);
    setAnalysisPhase(0);
    setFromCache(false);

    const ticker = setInterval(
      () => setAnalysisPhase((p) => Math.min(p + 1, ANALYSIS_PHASES.length - 1)),
      1100
    );

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
        setFromCache(!!data.cached);

        if (existing) {
          // Smart Merge: compute conflicts, default decisions (keep / merge).
          const plan = computeMergePlan(existing.property, existing.items, data.extraction);
          setMergePlan(plan);
          setFieldDecisions(
            Object.fromEntries(plan.fieldConflicts.map((c) => [c.field, "keep" as FieldDecision]))
          );
          setCategoryDecisions(
            Object.fromEntries(plan.categoryConflicts.map((c) => [c.category, "merge" as CategoryDecision]))
          );
          const eb = existing.property.quick_buttons as QuickButtonKey[] | null;
          setQuickButtons(eb ?? [...ALL_QUICK_BUTTONS]);
        } else {
          setQuickButtons(data.quickButtons ?? [...ALL_QUICK_BUTTONS]);
        }
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
  function setProp<K extends PropertyFieldKey>(key: K, value: string) {
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
      addItem({ category: s.category, title: KNOWLEDGE_CATEGORY_LABELS[s.category], content: "", confidence: null });
      return;
    }
    setSuggestBusy(s.category);
    try {
      const res = await fetch("/api/wizard/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: s.category, area, language: languages[0] ?? "el" }),
      });
      const data = await res.json();
      if (data?.item) addItem({ ...data.item, confidence: null });
    } finally {
      setSuggestBusy(null);
    }
  }

  function toggleQuickButton(key: QuickButtonKey) {
    setQuickButtons((qb) => (qb.includes(key) ? qb.filter((k) => k !== key) : [...qb, key]));
  }

  // ----- Finish -----
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

    if (existing && mergePlan) {
      // ---------- Smart Merge into the existing property ----------
      const updates: Record<string, unknown> = {};
      for (const field of mergePlan.newFields) updates[field] = p[field];
      for (const c of mergePlan.fieldConflicts) {
        if (fieldDecisions[c.field] === "replace") updates[c.field] = p[c.field];
      }
      if (!existing.property.welcome_message?.trim() && extraction.welcome_message.trim()) {
        updates.welcome_message = extraction.welcome_message;
      }
      updates.quick_buttons = quickButtons;

      const { error: upErr } = await supabase
        .from("properties")
        .update(updates)
        .eq("id", existing.property.id);
      if (upErr) {
        setFinishError(upErr.message);
        setFinishing(false);
        return;
      }

      // Categories the owner chose to REPLACE: clear old items first.
      const replaceCats = mergePlan.categoryConflicts
        .filter((c) => categoryDecisions[c.category] === "replace")
        .map((c) => c.category);
      if (replaceCats.length > 0) {
        await supabase
          .from("knowledge_items")
          .delete()
          .eq("property_id", existing.property.id)
          .in("category", replaceCats);
      }

      const itemsToInsert = extraction.items
        .filter((it) => it.title.trim() && it.content.trim())
        .map(({ category, title, content }) => ({
          property_id: existing.property.id,
          category, title, content,
        }));
      if (itemsToInsert.length > 0) {
        const { error: kbErr } = await supabase.from("knowledge_items").insert(itemsToInsert);
        if (kbErr) console.error("Knowledge insert failed:", kbErr.message);
      }

      setResultId(existing.property.id);
    } else {
      // ---------- Create a new property ----------
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
        .map(({ category, title, content }) => ({ property_id: created.id, category, title, content }));
      if (itemsToInsert.length > 0) {
        const { error: kbErr } = await supabase.from("knowledge_items").insert(itemsToInsert);
        if (kbErr) console.error("Knowledge insert failed:", kbErr.message);
      }
      setResultId(created.id);
    }

    setFinishing(false);
    setStep(5);
  }

  const pc = extraction?.property_confidence ?? {};

  // =============================================================
  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="fade-in flex items-center gap-3">
        <span className="rounded-full bg-gold/20 p-2">
          {isImport ? <GitMerge className="h-5 w-5 text-gold" /> : <Wand2 className="h-5 w-5 text-gold" />}
        </span>
        <div>
          <h1 className="font-display text-3xl tracking-tight">
            {isImport ? "AI Import" : "AI Setup Wizard"}
          </h1>
          <p className="text-sm text-sea/60">
            {isImport
              ? `Εισαγωγή πληροφοριών στο «${existing?.property.name ?? "…"}» — τίποτα δεν αντικαθίσταται χωρίς την έγκρισή σας.`
              : "Το GuestFlow σας, έτοιμο σε λιγότερο από 5 λεπτά."}
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
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300 ${
                    done
                      ? "border-aegean bg-aegean text-white"
                      : active
                        ? "border-aegean bg-white text-aegean shadow-soft"
                        : "border-sea/20 bg-white text-sea/40"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : n}
                </span>
                <span className={`mt-1.5 hidden text-xs sm:block ${active ? "font-medium text-sea" : "text-sea/50"}`}>
                  {label}
                </span>
              </div>
              {n < STEPS.length && (
                <div className={`mx-2 mb-5 h-0.5 flex-1 rounded transition-colors duration-300 sm:mb-0 ${done ? "bg-aegean" : "bg-sea/15"}`} />
              )}
            </li>
          );
        })}
      </ol>

      {/* ================= STEP 1 ================= */}
      {step === 1 && (
        <div className="card fade-in mt-8">
          <h2 className="font-display text-xl">Στοιχεία καταλύματος</h2>
          <p className="mt-1 text-sm text-sea/60">
            {isImport
              ? "Τα στοιχεία του υπάρχοντος καταλύματος — μπορείτε να τα διορθώσετε."
              : "Μόνο τα βασικά — όλα τα υπόλοιπα θα τα βρει το AI στο επόμενο βήμα."}
          </p>
          {loadingExisting ? (
            <div className="mt-6 space-y-4">
              <div className="skeleton h-11 rounded-xl" />
              <div className="skeleton h-11 rounded-xl" />
            </div>
          ) : (
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
                      className={`rounded-full px-4 py-1.5 text-sm transition-all ${
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
          )}
          <div className="mt-8 flex justify-end">
            <button onClick={() => setStep(2)} disabled={!name.trim() || loadingExisting} className="btn-primary">
              Συνέχεια <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2 ================= */}
      {step === 2 && (
        <div className="card fade-in mt-8">
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
            <button onClick={() => setStep(3)} disabled={pasted.trim().length < 20} className="btn-primary">
              <Sparkles className="h-4 w-4" /> Generate Knowledge Base
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3 — Analysis ================= */}
      {step === 3 && (
        <div className="card fade-in mt-8">
          {!analysisError ? (
            <div className="py-4">
              <h2 className="text-center font-display text-xl">Το AI αναλύει το κείμενό σας</h2>
              {/* Progress bar */}
              <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-sand">
                <div
                  className="h-full rounded-full bg-aegean transition-all duration-700"
                  style={{ width: `${Math.min(92, ((analysisPhase + 1) / ANALYSIS_PHASES.length) * 100)}%` }}
                />
              </div>
              <ul className="mx-auto mt-7 max-w-xs space-y-2.5 text-sm">
                {ANALYSIS_PHASES.map((phase, i) => (
                  <li key={phase} className={`flex items-center gap-2.5 transition-all duration-300 ${
                    i <= analysisPhase ? "opacity-100" : "opacity-30"
                  }`}>
                    {i < analysisPhase ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                        <Check className="h-3 w-3 text-green-600" />
                      </span>
                    ) : i === analysisPhase ? (
                      <Loader2 className="h-5 w-5 animate-spin text-aegean" />
                    ) : (
                      <span className="h-5 w-5 rounded-full border-2 border-sea/15" />
                    )}
                    {phase}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="py-4 text-center">
              <h2 className="font-display text-xl text-red-700">Η ανάλυση απέτυχε</h2>
              <p className="mt-2 text-sm text-sea/70">{analysisError}</p>
              <div className="mt-6 flex justify-center gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary">
                  <ArrowLeft className="h-4 w-4" /> Πίσω
                </button>
                <button
                  onClick={() => { setAnalysisError(null); analysisStarted.current = false; setAnalysisPhase(0); setStep(3); }}
                  className="btn-primary"
                >
                  Δοκιμή ξανά
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= STEP 4 — Review ================= */}
      {step === 4 && extraction && (
        <div className="fade-in mt-8 space-y-6">
          {fromCache && (
            <p className="rounded-xl bg-foam px-4 py-2.5 text-xs text-aegean">
              ⚡ Ίδιο κείμενο με προηγούμενη ανάλυση — χρησιμοποιήθηκε το αποθηκευμένο αποτέλεσμα (κανένα AI κόστος).
            </p>
          )}

          {/* -------- Smart Merge: Already Existing Information -------- */}
          {mergePlan && (mergePlan.fieldConflicts.length > 0 || mergePlan.categoryConflicts.length > 0) && (
            <div className="card border-aegean/40 bg-foam/40">
              <div className="flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-aegean" />
                <h2 className="font-display text-lg">Already Existing Information</h2>
              </div>
              <p className="mt-1 text-sm text-sea/60">
                Βρέθηκαν πληροφορίες που υπάρχουν ήδη. Επιλέξτε τι θα γίνει με καθεμία —
                τίποτα δεν αντικαθίσταται χωρίς την απόφασή σας.
              </p>

              {mergePlan.fieldConflicts.length > 0 && (
                <div className="mt-4 space-y-3">
                  {mergePlan.fieldConflicts.map((c) => (
                    <div key={c.field} className="rounded-xl bg-white p-4 shadow-soft">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{c.label}</p>
                        <div className="flex gap-1.5">
                          {(["keep", "replace"] as FieldDecision[]).map((d) => (
                            <button
                              key={d}
                              onClick={() => setFieldDecisions((fd) => ({ ...fd, [c.field]: d }))}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                fieldDecisions[c.field] === d
                                  ? "bg-aegean text-white"
                                  : "border border-sea/20 text-sea/60 hover:border-aegean"
                              }`}
                            >
                              {d === "keep" ? "Keep Existing" : "Replace"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                        <div className={`rounded-lg px-3 py-2 ${fieldDecisions[c.field] === "keep" ? "bg-sand ring-1 ring-aegean/30" : "bg-sand/40 opacity-60"}`}>
                          <span className="font-medium text-sea/60">Υπάρχον:</span> {c.existing}
                        </div>
                        <div className={`rounded-lg px-3 py-2 ${fieldDecisions[c.field] === "replace" ? "bg-sand ring-1 ring-aegean/30" : "bg-sand/40 opacity-60"}`}>
                          <span className="font-medium text-sea/60">Νέο:</span> {c.incoming}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mergePlan.categoryConflicts.length > 0 && (
                <div className="mt-4 space-y-2">
                  {mergePlan.categoryConflicts.map((c) => (
                    <div key={c.category} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 shadow-soft">
                      <p className="text-sm">
                        <span className="font-medium">{c.label}</span>{" "}
                        <span className="text-sea/50">
                          ({c.existingCount} υπάρχ. + {c.incomingCount} νέα)
                        </span>
                      </p>
                      <div className="flex gap-1.5">
                        {(["merge", "replace"] as CategoryDecision[]).map((d) => (
                          <button
                            key={d}
                            onClick={() => setCategoryDecisions((cd) => ({ ...cd, [c.category]: d }))}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              categoryDecisions[c.category] === d
                                ? "bg-aegean text-white"
                                : "border border-sea/20 text-sea/60 hover:border-aegean"
                            }`}
                          >
                            {d === "merge" ? "Merge" : "Replace"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

          {/* Extracted property fields with confidence */}
          <div className="card">
            <h2 className="font-display text-xl">Στοιχεία που εντοπίστηκαν</h2>
            <p className="mt-1 text-sm text-sea/60">
              Ελέγξτε και διορθώστε ό,τι χρειάζεται. Το ποσοστό δείχνει πόσο σίγουρο είναι το AI.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(
                [
                  { key: "checkin_time", label: "Check-in", inputType: "time" },
                  { key: "checkout_time", label: "Check-out", inputType: "time" },
                  { key: "wifi_name", label: "Όνομα WiFi", inputType: "text" },
                  { key: "wifi_password", label: "Κωδικός WiFi", inputType: "text" },
                  { key: "phone", label: "Τηλέφωνο", inputType: "text" },
                  { key: "emergency_contact", label: "Emergency contact", inputType: "text" },
                ] as { key: PropertyFieldKey; label: string; inputType: string }[]
              ).map(({ key, label, inputType }) => {
                const conf = pc[key] ?? null;
                return (
                  <div key={key}>
                    <label className="label flex items-center gap-2" htmlFor={`r-${key}`}>
                      {label} <ConfidenceBadge value={conf} />
                    </label>
                    <input
                      id={`r-${key}`}
                      type={inputType}
                      className="field"
                      value={extraction.property[key]}
                      onChange={(e) => setProp(key, e.target.value)}
                    />
                    {conf !== null && conf < CONFIDENCE_WARNING_THRESHOLD && <VerifyWarning />}
                  </div>
                );
              })}
              {(
                [
                  { key: "house_rules", label: "Κανόνες σπιτιού" },
                  { key: "access_instructions", label: "Οδηγίες πρόσβασης" },
                ] as { key: PropertyFieldKey; label: string }[]
              ).map(({ key, label }) => {
                const conf = pc[key] ?? null;
                return (
                  <div key={key} className="sm:col-span-2">
                    <label className="label flex items-center gap-2" htmlFor={`r-${key}`}>
                      {label} <ConfidenceBadge value={conf} />
                    </label>
                    <textarea
                      id={`r-${key}`}
                      className="field min-h-20"
                      value={extraction.property[key]}
                      onChange={(e) => setProp(key, e.target.value)}
                    />
                    {conf !== null && conf < CONFIDENCE_WARNING_THRESHOLD && <VerifyWarning />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Welcome message */}
          <div className="card">
            <h2 className="font-display text-xl">Μήνυμα καλωσορίσματος</h2>
            <p className="mt-1 text-sm text-sea/60">Το πρώτο μήνυμα που βλέπει ο επισκέπτης στο chat.</p>
            <textarea
              className="field mt-4 min-h-20"
              value={extraction.welcome_message}
              onChange={(e) => setExtraction((ex) => (ex ? { ...ex, welcome_message: e.target.value } : ex))}
              placeholder="π.χ. Καλώς ήρθατε στη βίλα μας! Είμαι εδώ για ό,τι χρειαστείτε."
            />
            {isImport && existing?.property.welcome_message?.trim() && (
              <p className="mt-2 text-xs text-sea/50">
                Το υπάρχον μήνυμα καλωσορίσματος διατηρείται — το νέο εφαρμόζεται μόνο αν το υπάρχον είναι κενό.
              </p>
            )}
          </div>

          {/* Knowledge items with confidence */}
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">
                Βάση γνώσης <span className="text-sm font-normal text-sea/50">({extraction.items.length})</span>
              </h2>
              <button
                onClick={() => addItem({ category: "faq", title: "", content: "", confidence: null })}
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
                <div key={i} className="rounded-xl border border-sea/10 bg-sand/40 p-4 transition-shadow hover:shadow-soft">
                  <div className="flex flex-wrap items-center gap-3">
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
                    <ConfidenceBadge value={item.confidence} />
                    <button
                      onClick={() => removeItem(i)}
                      className="rounded-full p-2 text-sea/40 transition-colors hover:bg-red-50 hover:text-red-600"
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
                  {item.confidence !== null && item.confidence !== undefined &&
                    item.confidence < CONFIDENCE_WARNING_THRESHOLD && <VerifyWarning />}
                </div>
              ))}
            </div>
          </div>

          {/* Quick buttons */}
          <div className="card">
            <h2 className="font-display text-xl">Quick buttons επισκέπτη</h2>
            <p className="mt-1 text-sm text-sea/60">Τα κουμπιά γρήγορων ερωτήσεων στη σελίδα του επισκέπτη.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ALL_QUICK_BUTTONS.map((key) => (
                <button
                  key={key}
                  onClick={() => toggleQuickButton(key)}
                  className={`rounded-full px-4 py-1.5 text-sm transition-all ${
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
      {step === 5 && resultId && (
        <div className="card fade-in mt-8 text-center">
          <span className="pop-in mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </span>
          <h2 className="mt-5 font-display text-2xl">
            {isImport ? "✅ Import ολοκληρώθηκε!" : "✅ GuestFlow is ready!"}
          </h2>
          <p className="mt-2 text-sea/60">{isImport ? "Ενημερώθηκαν:" : "Δημιουργήθηκαν:"}</p>
          <ul className="mx-auto mt-4 w-fit space-y-1.5 text-left text-sm">
            {["Knowledge Base", "FAQ", "Quick Actions", "Guest Welcome Message", "QR Code"].map((x, i) => (
              <li key={x} className="fade-in flex items-center gap-2" style={{ animationDelay: `${i * 90}ms` }}>
                <Check className="h-4 w-4 text-green-600" /> {x}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => { router.push("/dashboard"); router.refresh(); }} className="btn-primary">
              <LayoutDashboard className="h-4 w-4" /> Open Dashboard
            </button>
            <Link href={`/dashboard/properties/${resultId}`} className="btn-secondary">
              <QrCode className="h-4 w-4" /> Κατάλυμα & QR
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
