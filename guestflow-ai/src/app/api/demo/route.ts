import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// POST /api/demo — seeds the demo property for the signed-in owner
// via the create_demo_property() SQL function (see supabase/schema.sql).
export async function POST() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The SQL function seeds for auth.uid() — no arguments accepted,
  // so a user can never seed data for someone else.
  const { data, error } = await supabase.rpc("create_demo_property");

  if (error) {
    console.error("Demo seeding failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ propertyId: data });
}
