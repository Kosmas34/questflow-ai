import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { aiChat } from "@/lib/ai/provider";
import { checkLimit } from "@/lib/rate-limit";
import { KNOWLEDGE_CATEGORY_LABELS, type KnowledgeCategory } from "@/lib/types";
import { normalizeCategory } from "@/lib/wizard/parse";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/wizard/suggest { category, area, language }
// Generates a DRAFT knowledge item for a missing category.
// Important: the draft uses [πλαίσια] placeholders instead of invented
// specifics — the owner fills in real names/numbers in the review step
// before anything is saved. We never let the AI fabricate local facts
// that guests would then be told as truth.
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkLimit(`wizard:suggest:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Πολλά αιτήματα. Δοκιμάστε ξανά σε λίγο." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const category: KnowledgeCategory = normalizeCategory(body?.category);
  const area: string = (body?.area ?? "").toString().slice(0, 120);
  const language: string = body?.language === "en" ? "English" : "Greek";
  const label = KNOWLEDGE_CATEGORY_LABELS[category];

  const system = `You draft a knowledge-base entry template for a hospitality app, for the category "${label}" of an accommodation${area ? ` in ${area}` : ""}.

OUTPUT: ONLY JSON, no fences: { "title": string, "content": string }

STRICT RULES:
- Write in ${language}.
- 2-4 short sentences or bullet-like lines.
- NEVER invent specific business names, phone numbers, prices or distances. Where a specific detail is needed, insert a bracketed placeholder the owner will replace, e.g. [όνομα εστιατορίου], [τηλέφωνο], [απόσταση].
- General, widely-true guidance for the area type is fine (e.g. that taxis can be called by phone), but nothing verifiable-specific.
- Tone: warm, practical, host-to-guest.`;

  try {
    const aiText = await aiChat([
      { role: "system", content: system },
      { role: "user", content: `Draft the "${label}" entry now.` },
    ]);
    const clean = aiText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] ?? clean);
    const title = String(parsed?.title ?? label).slice(0, 120);
    const content = String(parsed?.content ?? "").slice(0, 2000);
    if (!content) throw new Error("empty draft");

    return NextResponse.json({ item: { category, title, content } });
  } catch (err) {
    console.error("Wizard suggestion failed:", err);
    // Deterministic fallback template — the feature works even without AI.
    return NextResponse.json({
      item: {
        category,
        title: label,
        content:
          language === "Greek"
            ? `Συμπληρώστε εδώ πληροφορίες για: ${label}. π.χ. [όνομα], [διεύθυνση/απόσταση], [τηλέφωνο], [ώρες λειτουργίας].`
            : `Add your ${label} information here, e.g. [name], [address/distance], [phone], [opening hours].`,
      },
      fallback: true,
    });
  }
}
