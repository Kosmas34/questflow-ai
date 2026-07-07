import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aiChat, type AiMessage } from "@/lib/ai/provider";
import { detectRequest, detectTopic } from "@/lib/ai/intent";
import { detectSmallTalk, findRelevantItems } from "@/lib/ai/retrieval";
import { detectCoreIntent, handleCoreIntent } from "@/lib/ai/handlers";
import { checkLimit, clientIp, LIMITS, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { buildRequestEmail, sendEmail } from "@/lib/notify/email";
import { FALLBACK_ANSWER, type GuestLang } from "@/lib/i18n";
import { KNOWLEDGE_CATEGORY_LABELS, REQUEST_CATEGORY_LABELS, type KnowledgeCategory } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ChatBody {
  slug: string;
  sessionId: string;
  message: string;
  language: GuestLang;
  history: { role: "guest" | "assistant"; content: string }[];
}

const SMALL_TALK_REPLIES: Record<"greeting" | "thanks", Record<GuestLang, string>> = {
  greeting: {
    el: "Γεια σας! Πώς μπορώ να βοηθήσω με τη διαμονή σας;",
    en: "Hello! How can I help with your stay?",
  },
  thanks: {
    el: "Παρακαλώ! Είμαι εδώ αν χρειαστείτε οτιδήποτε άλλο. 😊",
    en: "You're welcome! I'm here if you need anything else. 😊",
  },
};

const REQUEST_CONFIRMATION: Record<GuestLang, string> = {
  el: "Το αίτημά σας στάλθηκε στον ιδιοκτήτη — θα σας εξυπηρετήσει το συντομότερο.",
  en: "Your request was sent to the host — they will assist you as soon as possible.",
};

// POST /api/guest/chat
// Pipeline: rate limits → session validation → request detection →
// small talk → knowledge retrieval → (AI only if relevant knowledge exists)
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ChatBody | null;
  if (!body?.slug || !body?.message || !body?.sessionId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const language: GuestLang = body.language === "en" ? "en" : "el";
  const message = body.message.slice(0, 1000);
  const ip = clientIp(req);

  // ---- 1. Rate limits (cheapest checks first, before any DB/AI work) ----
  if (
    !checkLimit(`chat:ip:${ip}`, LIMITS.chatPerIp.limit, LIMITS.chatPerIp.windowMs) ||
    !checkLimit(`chat:session:${body.sessionId}`, LIMITS.chatPerSession.limit, LIMITS.chatPerSession.windowMs)
  ) {
    return NextResponse.json({ answer: RATE_LIMIT_MESSAGE[language], rateLimited: true }, { status: 429 });
  }

  const supabase = supabaseAdmin();

  // ---- 2. Load property ----
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("slug", body.slug)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  // Per-property cap: one venue can't burn the whole AI budget.
  if (!checkLimit(`chat:property:${property.id}`, LIMITS.chatPerProperty.limit, LIMITS.chatPerProperty.windowMs)) {
    return NextResponse.json({ answer: RATE_LIMIT_MESSAGE[language], rateLimited: true }, { status: 429 });
  }

  // ---- 3. Session validation: the session MUST belong to this property ----
  const { data: session } = await supabase
    .from("guest_sessions")
    .select("id, property_id")
    .eq("id", body.sessionId)
    .single();

  if (!session || session.property_id !== property.id) {
    return NextResponse.json({ error: "Invalid session for this property" }, { status: 403 });
  }

  // ---- 4. Deterministic request detection (independent of AI) ----
  const detected = detectRequest(message);
  let requestCreated = false;
  if (detected) {
    const { error } = await supabase.from("requests").insert({
      property_id: property.id,
      session_id: session.id,
      category: detected.category,
      message,
    });
    requestCreated = !error;

    // Notify the owner by email (never blocks/fails the guest flow).
    if (requestCreated) {
      notifyOwner(property.owner_id, property.name, detected.category, message).catch(() => {});
    }
  }

  const topic = detectTopic(message);

  // ---- 5. Load ALL knowledge items for this property (always) ----
  const { data: knowledge } = await supabase
    .from("knowledge_items")
    .select("category, title, content")
    .eq("property_id", property.id);

  const knowledgeItems = (knowledge ?? []) as { category: string; title: string; content: string }[];

  // ---- 6. Log the guest message ----
  await supabase.from("guest_messages").insert({
    property_id: property.id,
    session_id: session.id,
    role: "guest",
    content: message,
    topic,
    language,
  });

  // ---- 7. Decide how to answer ----
  const answer = await composeAnswer({
    property,
    knowledgeItems,
    message,
    language,
    requestCreated,
    history: body.history,
  });

  // ---- 8. Log the assistant reply ----
  await supabase.from("guest_messages").insert({
    property_id: property.id,
    session_id: session.id,
    role: "assistant",
    content: answer,
    topic,
    language,
  });

  return NextResponse.json({ answer, requestCreated });
}

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") console.log("[guest-chat]", ...args);
};

/**
 * Answering pipeline (in order):
 * 1. small talk → canned reply, no AI
 * 2. deterministic core handler (wifi/checkin/checkout/phone/emergency/rules/
 *    access) → instant factual answer, no AI, no hallucination
 * 3. otherwise → ALWAYS call the AI as a concierge, giving it the full core
 *    property fields + a summary of ALL knowledge items (relevant items first).
 *    The AI only says the soft fallback when the info truly isn't there.
 *
 * The old bug: step 3 used to be skipped whenever keyword retrieval found
 * nothing, so rephrased questions got the fallback even though the data
 * existed. Now the AI always runs with full context.
 */
async function composeAnswer(opts: {
  property: Record<string, any>;
  knowledgeItems: { category: string; title: string; content: string }[];
  message: string;
  language: GuestLang;
  requestCreated: boolean;
  history: ChatBody["history"];
}): Promise<string> {
  const { property, knowledgeItems, message, language, requestCreated } = opts;

  devLog("property loaded:", property ? "yes" : "no");
  devLog("knowledge items count:", knowledgeItems.length);

  // ---- 1. Small talk ----
  const smallTalk = detectSmallTalk(message);
  if (smallTalk) {
    devLog("detected intent: small-talk:" + smallTalk, "| deterministic handler used: yes | AI call used: no");
    return SMALL_TALK_REPLIES[smallTalk][language];
  }

  // ---- 2. Deterministic core handlers (before AI) ----
  const coreIntent = detectCoreIntent(message);
  devLog("detected intent:", coreIntent ?? "none");
  if (coreIntent) {
    const direct = handleCoreIntent(coreIntent, property as any, language);
    if (direct) {
      devLog("deterministic handler used: yes | AI call used: no");
      // If a request was also opened (rare for core intents), append a note.
      if (requestCreated) return `${direct} ${REQUEST_CONFIRMATION[language]}`;
      return direct;
    }
    devLog("deterministic handler matched but no data → falling through to AI");
  }

  // ---- 3. AI concierge with FULL context ----
  // Order knowledge with the most relevant items first, but include ALL of
  // them so the AI can answer even loosely-related questions.
  const relevant = findRelevantItems(message, knowledgeItems as any);
  const relevantKeys = new Set(relevant.map((r) => `${r.title}|${r.content}`));
  const orderedItems = [
    ...relevant,
    ...knowledgeItems.filter((k) => !relevantKeys.has(`${k.title}|${k.content}`)),
  ];

  const knowledgeText =
    orderedItems.length > 0
      ? orderedItems
          .map(
            (k) =>
              `- [${KNOWLEDGE_CATEGORY_LABELS[k.category as KnowledgeCategory] ?? k.category}] ${k.title}: ${k.content}`
          )
          .join("\n")
      : "(no extra knowledge items yet)";

  const coreFields = [
    `Property name: ${property.name}`,
    property.area ? `Area: ${property.area}` : "",
    `Check-in: ${property.checkin_time || "not set"}`,
    `Check-out: ${property.checkout_time || "not set"}`,
    property.wifi_name ? `WiFi network: ${property.wifi_name}` : "",
    property.wifi_password ? `WiFi password: ${property.wifi_password}` : "",
    property.house_rules ? `House rules: ${property.house_rules}` : "",
    property.access_instructions ? `Access instructions: ${property.access_instructions}` : "",
    property.phone ? `Contact phone: ${property.phone}` : "",
    property.emergency_contact ? `Emergency contact: ${property.emergency_contact}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const system = `You are the front-desk concierge for "${property.name}"${property.area ? `, in ${property.area}` : ""}. You are chatting with a guest during their stay.

HOW TO REPLY:
- Warm, polite, concise and practical — like a friendly receptionist, not a robot.
- Reply in ${language === "el" ? "Greek" : "English"}.
- Use ONLY the information below. Do not invent specific names, prices, phone numbers, or places that are not given.
- Never say things like "according to the knowledge base" or quote raw field names. Just answer naturally.
- Keep it to 1–3 short sentences unless the guest asks for a list.
- If the specific detail truly isn't in the information below, reply with EXACTLY: "${FALLBACK_ANSWER[language]}"
${requestCreated ? `- The guest's request has just been forwarded to the property team. Reassure them warmly that someone will help.` : ""}

PROPERTY INFORMATION:
${coreFields}

WHAT THE PROPERTY OFFERS / LOCAL INFO:
${knowledgeText}`;

  const historyMessages: AiMessage[] = (opts.history ?? [])
    .slice(-10)
    .map((m) => ({
      role: m.role === "guest" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  try {
    devLog("deterministic handler used: no | AI call used: yes");
    return await aiChat([
      { role: "system", content: system },
      ...historyMessages,
      { role: "user", content: message },
    ]);
  } catch (err) {
    console.error("[guest-chat] AI provider failed:", err);
    return requestCreated ? REQUEST_CONFIRMATION[language] : FALLBACK_ANSWER[language];
  }
}

/** Looks up the owner's email via Supabase Auth and sends the notification. */
async function notifyOwner(
  ownerId: string,
  propertyName: string,
  category: string,
  message: string
): Promise<void> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.auth.admin.getUserById(ownerId);
  const email = data?.user?.email;
  if (error || !email) {
    console.warn("Owner email not found for notification");
    return;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await sendEmail(
    buildRequestEmail({
      to: email,
      propertyName,
      category: REQUEST_CATEGORY_LABELS[category] ?? category,
      message,
      dashboardUrl: `${appUrl}/dashboard/requests`,
    })
  );
}
