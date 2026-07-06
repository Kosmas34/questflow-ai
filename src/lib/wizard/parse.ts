// AI Setup Wizard — parsing & validation of the AI extraction result.
// Pure functions (no I/O) so they are unit-testable.

import { KNOWLEDGE_CATEGORY_LABELS, type KnowledgeCategory } from "@/lib/types";

export interface WizardItem {
  category: KnowledgeCategory;
  title: string;
  content: string;
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
  };
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
