import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/properties/:id/qr-card → printable A6 PDF room card.
// Copy per spec:
//   "Need help during your stay?"
//   "Scan here for WiFi, checkout, local tips and support"
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: property } = await supabase
    .from("properties")
    .select("name, slug")
    .eq("id", params.id)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const guestUrl = `${appUrl}/guest/${property.slug}`;

  const qrPng = await QRCode.toBuffer(guestUrl, {
    type: "png",
    width: 800,
    margin: 1,
    color: { dark: "#0E2A3B", light: "#FFFFFF" },
  });

  // A6 portrait: 298 x 420 pt
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([298, 420]);
  const { width, height } = page.getSize();

  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);

  const sea = rgb(14 / 255, 42 / 255, 59 / 255);
  const gold = rgb(233 / 255, 180 / 255, 76 / 255);
  const white = rgb(1, 1, 1);

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: sea });
  // Gold hairline frame
  page.drawRectangle({
    x: 12, y: 12, width: width - 24, height: height - 24,
    borderColor: gold, borderWidth: 1,
  });

  const centered = (text: string, font: typeof serif, size: number, y: number, color = white) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font, color });
  };

  // NOTE: pdf-lib standard fonts are Latin-only, so the printable card
  // is intentionally in English (matches the spec copy).
  centered("Need help during your stay?", serif, 19, height - 70);
  centered("Scan here for WiFi, checkout,", sans, 11, height - 96, rgb(0.85, 0.88, 0.9));
  centered("local tips and support", sans, 11, height - 111, rgb(0.85, 0.88, 0.9));

  // QR on a white rounded-ish plate
  const qrImage = await pdf.embedPng(qrPng);
  const qrSize = 170;
  const plate = qrSize + 20;
  page.drawRectangle({
    x: (width - plate) / 2,
    y: (height - plate) / 2 - 20,
    width: plate,
    height: plate,
    color: white,
  });
  page.drawImage(qrImage, {
    x: (width - qrSize) / 2,
    y: (height - qrSize) / 2 - 10,
    width: qrSize,
    height: qrSize,
  });

  centered("24/7 digital concierge", sans, 10, 78, gold);
  centered(guestUrl.replace(/^https?:\/\//, ""), sans, 8, 58, rgb(0.7, 0.75, 0.8));
  centered("Powered by GuestFlow AI", sans, 8, 30, rgb(0.55, 0.62, 0.68));

  const bytes = await pdf.save();
  const filename = `${property.slug}-room-qr-card.pdf`;

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
