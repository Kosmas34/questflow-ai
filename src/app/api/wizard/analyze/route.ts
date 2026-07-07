import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { aiChat } from "@/lib/ai/provider";
import { parseWizardResponse, computeSuggestions, suggestQuickButtons } from "@/lib/wizard/parse";
import { checkLimit } from "@/lib/rate-limit";
import { KNOWLEDGE_CATEGORY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ---- Import cache: identical input → cached result, no AI call ----
// Keyed by sha256(text|name|area). In-memory per instance, 1h TTL.
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 50;
const analysisCache = new Map<string, { data: unknown; ts: number }>();

function cacheKey(text: string, name: string, area: string): string {
  return createHash("sha256").update(`${text}|${name}|${area}`).digest("hex");
}

function cacheGet(key: string): unknown | null {
  const hit = analysisCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    analysisCache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key: string, data: unknown): void {
  if (analysisCache.size >= CACHE_MAX) {
    // Drop the oldest entry.
    const oldest = analysisCache.keys().next().value;
    if (oldest) analysisCache.delete(oldest);
  }
  analysisCache.set(key, { data, ts: Date.now() });
}

// POST /api/wizard/analyze { text, propertyName?, area? }
// Owner-authenticated. Extracts structured property data + knowledge
// items from freeform pasted text (welcome message, Airbnb description…).
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const text: string = (body?.text ?? "").toString().slice(0, 12000);
  const propertyName: string = (body?.propertyName ?? "").toString().slice(0, 120);
  const area: string = (body?.area ?? "").toString().slice(0, 120);

  if (text.trim().length < 20) {
    return NextResponse.json(
      { error: "Το κείμενο είναι πολύ μικρό για ανάλυση." },
      { status: 400 }
    );
  }

  // Cache hit → free and instant; doesn't count against the rate limit.
  const key = cacheKey(text, propertyName, area);
  const cached = cacheGet(key);
  if (cached) {
    return NextResponse.json({ ...(cached as object), cached: true });
  }

  // Protect AI credits: 10 fresh analyses per hour per owner is plenty.
  if (!checkLimit(`wizard:analyze:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Πολλές αναλύσεις σε σύντομο διάστημα. Δοκιμάστε ξανά σε λίγο." },
      { status: 429 }
    );
  }

  const categoriesDoc = Object.entries(KNOWLEDGE_CATEGORY_LABELS)
    .map(([key, label]) => `  - "${key}" (${label})`)
    .join("\n");

  const system = `You are a data-extraction engine for a hospitality app. The user pastes freeform text about their accommodation (welcome message, Airbnb/Booking description, notes). Extract structured data.

OUTPUT: ONLY a valid JSON object. No markdown fences, no commentary.

SCHEMA:
{
  "property": {
    "name": string,               // property name if mentioned, else ""
    "area": string,               // location/area if mentioned, else ""
    "checkin_time": "HH:MM",      // 24h format, "" if not mentioned
    "checkout_time": "HH:MM",
    "wifi_name": string,
    "wifi_password": string,
    "phone": string,              // host/contact phone
    "emergency_contact": string,
    "house_rules": string,        // all rules joined with newlines
    "access_instructions": string // how to reach/enter the property
  },
  "welcome_message": string,      // ONE warm 1-2 sentence greeting for guests, written in the SAME language as the input text. Compose it from the property's tone; do not invent facts.
  "items": [                      // knowledge base entries
    { "category": string, "title": string, "content": string, "confidence": number }
  ],
  "property_confidence": {        // 0-100 per property field you filled
    "checkin_time": number, "checkout_time": number, "wifi_name": number,
    "wifi_password": number, "phone": number, "emergency_contact": number,
    "house_rules": number, "access_instructions": number
  }
}

CONFIDENCE (0-100): how certain you are the extraction is correct and complete.
- 95-100: stated explicitly and unambiguously (e.g. "WiFi password: 12345678")
- 70-94: clearly implied but slightly ambiguous wording
- below 70: uncertain, partial, or inferred — the owner must verify

CATEGORY must be one of:
${categoriesDoc}
Map related info: restaurants→food, bars/cafes→drinks, taxi/bus/transfers→transport, useful tips & local recommendations & anything else→faq.

RULES:
- Extract ONLY facts present in the text. NEVER invent names, prices, phone numbers or places.
- Every distinct piece of information becomes its own item with a short clear title (in the input language) and the full detail in content.
- Do not duplicate wifi/checkin/checkout/rules into items if captured in property fields — EXCEPT create one "faq" item per rule-like tip that doesn't fit the fields.
- Keep the input language (Greek stays Greek, English stays English).`;

  const userMsg = `${propertyName ? `Property name (from the form): ${propertyName}\n` : ""}${area ? `Area (from the form): ${area}\n` : ""}TEXT TO ANALYZE:\n"""\n${text}\n"""`;

  try {
    const aiText = await aiChat([
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ]);
    const extraction = parseWizardResponse(aiText);

    // Form values win over extracted ones when the owner already typed them.
    if (propertyName) extraction.property.name = propertyName;
    if (area) extraction.property.area = area;

    const payload = {
      extraction,
      suggestions: computeSuggestions(extraction.items),
      quickButtons: suggestQuickButtons(extraction.items),
    };
    cacheSet(key, payload);
    return NextResponse.json(payload);
  } catch (err) {
    console.error("Wizard analysis failed:", err);
    return NextResponse.json(
      { error: "Η ανάλυση απέτυχε. Ελέγξτε ότι το AI provider είναι ρυθμισμένο (AI_API_KEY) και δοκιμάστε ξανά." },
      { status: 502 }
    );
  }
}
