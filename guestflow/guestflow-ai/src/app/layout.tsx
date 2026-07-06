import type { Metadata, Viewport } from "next";
import "./globals.css";

// Fonts: loaded via a runtime <link> instead of next/font/google.
// Why: next/font fetches fonts from Google at BUILD time, which breaks
// `npm run build` in offline/locked-down environments. With a runtime
// stylesheet the build never depends on the network; if the fonts can't
// load in the browser we degrade gracefully to the system font stacks
// defined in globals.css.
const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap";

export const metadata: Metadata = {
  title: "GuestFlow AI — Ο AI concierge του καταλύματός σας",
  description:
    "Οι επισκέπτες σκανάρουν ένα QR και παίρνουν άμεσες απαντήσεις για WiFi, check-in, checkout, οδηγίες και προτάσεις.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      </head>
      <body className="font-body bg-shore text-sea antialiased">{children}</body>
    </html>
  );
}
