import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkLimit, clientIp, LIMITS } from "@/lib/rate-limit";

// POST /api/guest/session { slug, language }
// Creates a guest session (one per QR visit). Rate limited per IP and
// per property so nobody can flood the sessions table.
export async function POST(req: Request) {
  const { slug, language } = await req.json().catch(() => ({}));
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const ip = clientIp(req);
  if (!checkLimit(`session:ip:${ip}`, LIMITS.sessionPerIp.limit, LIMITS.sessionPerIp.windowMs)) {
    return NextResponse.json({ error: "Too many sessions" }, { status: 429 });
  }

  const supabase = supabaseAdmin();
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  if (
    !checkLimit(
      `session:property:${property.id}`,
      LIMITS.sessionPerProperty.limit,
      LIMITS.sessionPerProperty.windowMs
    )
  ) {
    return NextResponse.json({ error: "Too many sessions" }, { status: 429 });
  }

  const { data: session, error } = await supabase
    .from("guest_sessions")
    .insert({ property_id: property.id, language: language === "en" ? "en" : "el" })
    .select("id")
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Could not create session" }, { status: 500 });
  }

  return NextResponse.json({ sessionId: session.id });
}
