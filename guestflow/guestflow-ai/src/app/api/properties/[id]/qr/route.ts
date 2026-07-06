import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/properties/:id/qr → PNG QR code pointing to the guest page.
// RLS guarantees only the owner can resolve their own property here.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: property } = await supabase
    .from("properties")
    .select("slug")
    .eq("id", params.id)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const guestUrl = `${appUrl}/guest/${property.slug}`;

  const png = await QRCode.toBuffer(guestUrl, {
    type: "png",
    width: 600,
    margin: 2,
    color: { dark: "#0E2A3B", light: "#FFFFFF" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=60",
    },
  });
}
