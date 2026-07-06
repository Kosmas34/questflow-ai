import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aiChat, type AiMessage } from "@/lib/ai/provider";
import { detectRequest, detectTopic } from "@/lib/ai/intent";
import {
  detectSmallTalk,
  findRelevantItems,
  propertyPseudoItems,
  type RetrievableItem,
} from "@/lib/ai/retrieval";
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

  // ---- 5. Log the guest message ----
  await supabase.from("guest_messages").insert({
    property_id: property.id,
    session_id: session.id,
    role: "guest",
    content: message,
    topic,
    language,
  });

  // ---- 6. Decide how to answer ----
  const answer = await composeAnswer({ property, message, language, requestCreated, history: body.history });

  // ---- 7. Log the assistant reply ----
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

/**
 * Retrieval-first answering:
 * - small talk → canned reply, no AI
 * - request with no informational need → canned confirmation, no AI
 * - no relevant knowledge → exact fallback sentence, no AI call at all
 * - relevant knowledge found → AI sees ONLY those items
 */
async function composeAnswer(opts: {
  property: Record<string, any>;
  message: string;
  language: GuestLang;
  requestCreated: boolean;
  history: ChatBody["history"];
}): Promise<string> {
  const { property, message, language, requestCreated } = opts;

  const smallTalk = detectSmallTalk(message);
  if (smallTalk) return SMALL_TALK_REPLIES[smallTalk][language];

  // Gather owner knowledge: DB items + property fields as pseudo-items.
  const supabase = supabaseAdmin();
  const { data: knowledge } = await supabase
    .from("knowledge_items")
    .select("category, title, content")
    .eq("property_id", property.id);

  const allItems: RetrievableItem[] = [
    ...propertyPseudoItems(property as any),
    ...((knowledge ?? []) as RetrievableItem[]),
  ];

  const relevant = findRelevantItems(message, allItems);

  // Nothing relevant → don't call the AI at all.
  if (relevant.length === 0) {
    return requestCreated ? REQUEST_CONFIRMATION[language] : FALLBACK_ANSWER[language];
  }

  const knowledgeText = relevant
    .map(
      (k) =>
        `[${KNOWLEDGE_CATEGORY_LABELS[k.category as KnowledgeCategory] ?? k.category}] ${k.title}: ${k.content}`
    )
    .join("\n");

  const system = `You are the digital concierge of "${property.name}" (${property.type}) in ${property.area || "Greece"}.

STRICT RULES:
- Answer ONLY using the PROPERTY INFORMATION below. Never invent details, prices, names, or recommendations that are not listed.
- If the information needed is not present below, reply with EXACTLY this sentence and nothing else: "${FALLBACK_ANSWER[language]}"
- Reply in ${language === "el" ? "Greek" : "English"}.
- Be warm, brief and practical. 1–3 short sentences unless listing options.
${requestCreated ? `- The guest's request was just forwarded to the host. Confirm this reassuringly in your reply.` : ""}

PROPERTY INFORMATION:
${knowledgeText}`;

  const historyMessages: AiMessage[] = (opts.history ?? [])
    .slice(-10)
    .map((m) => ({
      role: m.role === "guest" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  try {
    return await aiChat([
      { role: "system", content: system },
      ...historyMessages,
      { role: "user", content: message },
    ]);
  } catch (err) {
    console.error("AI provider failed:", err);
    // Graceful degradation: confirm the request or fall back.
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
