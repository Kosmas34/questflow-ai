import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/properties/:id/qr-card → printable A6 PDF room card.
// Premium hotel-room layout. Copy per spec:
//   "Need anything during your stay?"
//   "Scan for WiFi, checkout, local tips and guest support."
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

  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const sea = rgb(14 / 255, 42 / 255, 59 / 255);
  const seaDeep = rgb(21 / 255, 75 / 255, 128 / 255);
  const gold = rgb(233 / 255, 180 / 255, 76 / 255);
  const white = rgb(1, 1, 1);
  const mist = rgb(0.82, 0.86, 0.9);

  // Background: solid sea, plus a lighter band behind the header for depth.
  page.drawRectangle({ x: 0, y: 0, width, height, color: sea });
  page.drawRectangle({ x: 0, y: height - 150, width, height: 150, color: seaDeep, opacity: 0.35 });

  // Gold hairline frame
  page.drawRectangle({
    x: 14, y: 14, width: width - 28, height: height - 28,
    borderColor: gold, borderWidth: 1,
  });

  const centered = (text: string, font: typeof serif, size: number, y: number, color = white) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font, color });
  };

  // Property name (transliterated — pdf-lib standard fonts are Latin-only).
  const displayName = toLatin(property.name).toUpperCase();
  centered(displayName.slice(0, 26), sansBold, 12, height - 48, gold);

  // Small gold divider
  page.drawRectangle({ x: (width - 34) / 2, y: height - 60, width: 34, height: 1.5, color: gold });

  // Headline + subcopy (spec)
  centered("Need anything", serifBold, 21, height - 90);
  centered("during your stay?", serifBold, 21, height - 113);
  centered("Scan for WiFi, checkout, local", sans, 10, height - 134, mist);
  centered("tips and guest support.", sans, 10, height - 148, mist);

  // QR on a white plate
  const qrImage = await pdf.embedPng(qrPng);
  const qrSize = 168;
  const plate = qrSize + 22;
  const plateY = 118;
  page.drawRectangle({ x: (width - plate) / 2, y: plateY, width: plate, height: plate, color: white });
  // gold corner accents on the plate
  const cx = (width - plate) / 2;
  const corner = 10;
  [[cx, plateY + plate - corner], [cx + plate - corner, plateY + plate - corner], [cx, plateY], [cx + plate - corner, plateY]].forEach(
    ([x, y]) => page.drawRectangle({ x, y, width: corner, height: corner, color: gold, opacity: 0.9 })
  );
  page.drawImage(qrImage, { x: (width - qrSize) / 2, y: plateY + 11, width: qrSize, height: qrSize });

  // "Scan me" hint
  centered("Point your camera here", sans, 8, plateY - 14, mist);

  // Footer
  centered("24/7 DIGITAL CONCIERGE", sansBold, 8, 66, gold);
  centered(guestUrl.replace(/^https?:\/\//, ""), sans, 7.5, 50, rgb(0.6, 0.66, 0.72));

  // Powered by
  centered("Powered by GuestFlow AI", sans, 8, 28, rgb(0.5, 0.57, 0.64));

  const bytes = await pdf.save();
  const filename = `${property.slug}-room-qr-card.pdf`;

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// Transliterate Greek → Latin so property names render with the built-in
// Latin-only PDF fonts (no external font embedding needed).
function toLatin(input: string): string {
  const map: Record<string, string> = {
    α: "a", ά: "a", β: "v", γ: "g", δ: "d", ε: "e", έ: "e", ζ: "z", η: "i", ή: "i",
    θ: "th", ι: "i", ί: "i", ϊ: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o",
    ό: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", ύ: "y", ϋ: "y", φ: "f",
    χ: "ch", ψ: "ps", ω: "o", ώ: "o",
  };
  return input
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase();
      const mapped = map[lower];
      if (!mapped) return /[\x00-\x7F]/.test(ch) ? ch : "";
      return ch === lower ? mapped : mapped.toUpperCase();
    })
    .join("");
}
