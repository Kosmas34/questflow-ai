// AI Setup Wizard — parsing & validation of the AI extraction result.
// Pure functions (no I/O) so they are unit-testable.

import { KNOWLEDGE_CATEGORY_LABELS, type KnowledgeCategory } from "@/lib/types";

export interface WizardItem {
  category: KnowledgeCategory;
  title: string;
  content: string;
  /** AI extraction confidence 0-100; null when the model didn't report one. */
  confidence?: number | null;
}

export interface WizardExtraction {
  property: {
    name: string;
    area: string;
    checkin_time: string;
    checkout_time: string;
    wifi_name: string;
    wifi_password: string;
    phone: string;
    emergency_contact: string;
    house_rules: string;
    access_instructions: string;
  };
  welcome_message: string;
  items: WizardItem[];
  /** Confidence per property field (0-100), when reported by the model. */
  property_confidence: Partial<Record<keyof WizardExtraction["property"], number>>;
}

const VALID_CATEGORIES = new Set<string>(Object.keys(KNOWLEDGE_CATEGORY_LABELS));

/** Maps loose AI category names to our fixed schema categories. */
const CATEGORY_ALIASES: Record<string, KnowledgeCategory> = {
  restaurant: "food", restaurants: "food", dining: "food", eat: "food",
  bar: "drinks", bars: "drinks", cafe: "drinks", coffee: "drinks",
  beach: "beaches",
  taxi: "transport", transportation: "transport", transfer: "transport", bus: "transport",
  market: "supermarket", groceries: "supermarket", shopping: "supermarket",
  tips: "faq", tip: "faq", useful_tips: "faq", recommendations: "faq",
  local_recommendations: "faq", info: "faq", other: "faq", general: "faq",
  emergency: "faq", contacts: "faq",
  house_rules: "rules", rule: "rules",
  internet: "wifi", "wi-fi": "wifi",
  checkin: "checkin_checkout", checkout: "checkin_checkout",
  check_in: "checkin_checkout", check_out: "checkin_checkout",
  "check-in": "checkin_checkout", "check-out": "checkin_checkout",
  pharmacies: "pharmacy", medical: "pharmacy",
};

export function normalizeCategory(raw: unknown): KnowledgeCategory {
  const c = String(raw ?? "").toLowerCase().trim();
  if (VALID_CATEGORIES.has(c)) return c as KnowledgeCategory;
  return CATEGORY_ALIASES[c] ?? "faq";
}

function str(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Clamps a confidence value to an integer 0-100; null if not a number. */
export function clampConfidence(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Fields below this threshold get a "please verify" warning in the UI. */
export const CONFIDENCE_WARNING_THRESHOLD = 70;

/** Validates "HH:MM"; returns fallback otherwise. */
function timeStr(v: unknown, fallback: string): string {
  const s = str(v, 5);
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(s) ? s.padStart(5, "0") : fallback;
}

/**
 * Strips markdown fences and parses the AI's JSON output into a fully
 * validated WizardExtraction. Never throws on malformed fields — bad
 * entries are dropped or defaulted, so the review step always renders.
 */
export function parseWizardResponse(aiText: string): WizardExtraction {
  const clean = aiText.replace(/```json|```/g, "").trim();
  let raw: any;
  try {
    raw = JSON.parse(clean);
  } catch {
    // Try to salvage the largest {...} block (models sometimes add prose).
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI did not return valid JSON");
    raw = JSON.parse(match[0]);
  }

  const p = raw?.property ?? {};
  const items: WizardItem[] = Array.isArray(raw?.items)
    ? raw.items
        .map((it: any): WizardItem => ({
          category: normalizeCategory(it?.category),
          title: str(it?.title, 120),
          content: str(it?.content, 2000),
          confidence: clampConfidence(it?.confidence),
        }))
        .filter((it: WizardItem) => it.title && it.content)
        .slice(0, 40)
    : [];

  return {
    property: {
      name: str(p?.name, 120),
      area: str(p?.area, 120),
      checkin_time: timeStr(p?.checkin_time, "15:00"),
      checkout_time: timeStr(p?.checkout_time, "11:00"),
      wifi_name: str(p?.wifi_name, 100),
      wifi_password: str(p?.wifi_password, 100),
      phone: str(p?.phone, 60),
      emergency_contact: str(p?.emergency_contact, 120),
      house_rules: str(p?.house_rules, 2000),
      access_instructions: str(p?.access_instructions, 2000),
    },
    welcome_message: str(raw?.welcome_message, 400),
    items,
    property_confidence: parsePropertyConfidence(raw?.property_confidence),
  };
}

function parsePropertyConfidence(
  raw: any
): WizardExtraction["property_confidence"] {
  const out: WizardExtraction["property_confidence"] = {};
  if (!raw || typeof raw !== "object") return out;
  const keys: (keyof WizardExtraction["property"])[] = [
    "name", "area", "checkin_time", "checkout_time", "wifi_name",
    "wifi_password", "phone", "emergency_contact", "house_rules",
    "access_instructions",
  ];
  for (const k of keys) {
    const c = clampConfidence(raw[k]);
    if (c !== null) out[k] = c;
  }
  return out;
}

// ---------------------------------------------------------------
// AI Suggestions: "I noticed there's no info about X"
// Deterministic — computed from what's actually missing.
// ---------------------------------------------------------------

export interface WizardSuggestion {
  category: KnowledgeCategory;
  label: string; // what's missing (Greek, shown to the owner)
  action: "add" | "generate"; // add empty section vs AI-generate a draft
}

const SUGGESTION_ORDER: { category: KnowledgeCategory; label: string; action: "add" | "generate" }[] = [
  { category: "transport", label: "Ταξί / Μετακινήσεις", action: "add" },
  { category: "parking", label: "Πάρκινγκ", action: "add" },
  { category: "food", label: "Προτάσεις για εστιατόρια", action: "generate" },
  { category: "beaches", label: "Παραλίες", action: "add" },
  { category: "supermarket", label: "Σούπερ μάρκετ", action: "add" },
  { category: "pharmacy", label: "Φαρμακείο", action: "add" },
];

/** Returns suggestions for categories with no extracted knowledge. */
export function computeSuggestions(items: WizardItem[]): WizardSuggestion[] {
  const present = new Set(items.map((i) => i.category));
  return SUGGESTION_ORDER.filter((s) => !present.has(s.category));
}

// ---------------------------------------------------------------
// Quick buttons: suggest based on available knowledge.
// wifi / checkout / help are always useful; the rest only if
// the owner actually has content for them.
// ---------------------------------------------------------------

export const ALL_QUICK_BUTTONS = ["wifi", "checkout", "taxi", "restaurants", "beaches", "help"] as const;
export type QuickButtonKey = (typeof ALL_QUICK_BUTTONS)[number];

export function suggestQuickButtons(items: WizardItem[]): QuickButtonKey[] {
  const cats = new Set(items.map((i) => i.category));
  const buttons: QuickButtonKey[] = ["wifi", "checkout"];
  if (cats.has("transport")) buttons.push("taxi");
  if (cats.has("food")) buttons.push("restaurants");
  if (cats.has("beaches")) buttons.push("beaches");
  buttons.push("help");
  return buttons;
}


// ---------------------------------------------------------------
// Smart Merge: when importing into an EXISTING property, never
// overwrite silently — compute conflicts and let the owner decide.
// ---------------------------------------------------------------

export type PropertyFieldKey = keyof WizardExtraction["property"];

export const FIELD_LABELS: Record<PropertyFieldKey, string> = {
  name: "Όνομα",
  area: "Περιοχή",
  checkin_time: "Check-in",
  checkout_time: "Check-out",
  wifi_name: "Όνομα WiFi",
  wifi_password: "Κωδικός WiFi",
  phone: "Τηλέφωνο",
  emergency_contact: "Emergency contact",
  house_rules: "Κανόνες σπιτιού",
  access_instructions: "Οδηγίες πρόσβασης",
};

export interface FieldConflict {
  field: PropertyFieldKey;
  label: string;
  existing: string;
  incoming: string;
}

export interface CategoryConflict {
  category: KnowledgeCategory;
  label: string;
  existingCount: number;
  incomingCount: number;
}

export interface MergePlan {
  /** Field present in BOTH with different values → owner chooses Replace / Keep. */
  fieldConflicts: FieldConflict[];
  /** Field empty on the property, filled by the import → applied automatically. */
  newFields: PropertyFieldKey[];
  /** Category with items on BOTH sides → owner chooses Replace / Merge. */
  categoryConflicts: CategoryConflict[];
  /** Categories only in the import → inserted automatically. */
  newCategories: KnowledgeCategory[];
}

export function computeMergePlan(
  existing: WizardExtraction["property"],
  existingItems: { category: string }[],
  extraction: WizardExtraction
): MergePlan {
  const fieldConflicts: FieldConflict[] = [];
  const newFields: PropertyFieldKey[] = [];

  (Object.keys(FIELD_LABELS) as PropertyFieldKey[]).forEach((field) => {
    const oldVal = (existing[field] ?? "").trim();
    const newVal = (extraction.property[field] ?? "").trim();
    if (!newVal) return; // import has nothing → nothing to decide
    if (!oldVal) {
      newFields.push(field); // fills a gap → safe to apply
    } else if (oldVal !== newVal) {
      fieldConflicts.push({ field, label: FIELD_LABELS[field], existing: oldVal, incoming: newVal });
    }
  });

  const existingCats = new Map<string, number>();
  for (const it of existingItems) {
    existingCats.set(it.category, (existingCats.get(it.category) ?? 0) + 1);
  }
  const incomingCats = new Map<KnowledgeCategory, number>();
  for (const it of extraction.items) {
    incomingCats.set(it.category, (incomingCats.get(it.category) ?? 0) + 1);
  }

  const categoryConflicts: CategoryConflict[] = [];
  const newCategories: KnowledgeCategory[] = [];
  for (const [cat, count] of incomingCats) {
    const existingCount = existingCats.get(cat) ?? 0;
    if (existingCount > 0) {
      categoryConflicts.push({
        category: cat,
        label: KNOWLEDGE_CATEGORY_LABELS[cat],
        existingCount,
        incomingCount: count,
      });
    } else {
      newCategories.push(cat);
    }
  }

  return { fieldConflicts, newFields, categoryConflicts, newCategories };
}

export type FieldDecision = "replace" | "keep";
export type CategoryDecision = "replace" | "merge";
