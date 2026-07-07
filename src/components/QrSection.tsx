"use client";

import { useState } from "react";
import { Download, Link as LinkIcon, Check, Printer, DoorClosed } from "lucide-react";
import { useToast } from "@/components/Toast";
import DashboardCard from "@/components/DashboardCard";
import SectionTitle from "@/components/SectionTitle";

// "Rooms & QR" tab content: premium QR preview, copy link, download the
// printable card, print instructions, and a rooms placeholder.
export default function QrSection({ propertyId, slug }: { propertyId: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const guestUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/guest/${slug}`;

  async function copyLink() {
    await navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    toast.success("Το link αντιγράφηκε.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fade-in grid gap-6 lg:grid-cols-2">
      {/* Premium QR preview */}
      <DashboardCard title="Room QR" icon={DoorClosed}>
        <div className="rounded-2xl bg-gradient-to-br from-sea to-aegean-deep p-8 text-center">
          <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-lift">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/properties/${propertyId}/qr`}
              alt={`QR code για /guest/${slug}`}
              width={220}
              height={220}
              className="mx-auto"
            />
          </div>
          <p className="mt-5 font-display text-lg text-shore">Need anything during your stay?</p>
          <p className="mt-1 text-xs text-shore/70">Scan for WiFi, checkout, local tips and guest support.</p>
        </div>

        <div className="mt-5 space-y-3">
          <a href={`/api/properties/${propertyId}/qr-card`} className="btn-primary w-full" download>
            <Download className="h-4 w-4" /> Download QR Card (PDF)
          </a>
          <button onClick={copyLink} className="btn-secondary w-full">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4" />}
            {copied ? "Αντιγράφηκε!" : "Αντιγραφή guest link"}
          </button>
        </div>
      </DashboardCard>

      <div className="space-y-6">
        {/* Print instructions */}
        <DashboardCard title="Οδηγίες εκτύπωσης" icon={Printer}>
          <ol className="space-y-3 text-sm text-sea/75">
            {[
              "Κατεβάστε την κάρτα QR σε PDF (κουμπί δίπλα).",
              "Εκτυπώστε σε μέγεθος A6 — ιδανικά σε χαρτόνι 250–300g.",
              "Τοποθετήστε σε σταντ ή κορνίζα σε κάθε δωμάτιο, κοντά στο κρεβάτι ή στην είσοδο.",
              "Ο επισκέπτης σκανάρει με την κάμερα και ανοίγει αμέσως ο βοηθός — χωρίς εφαρμογή.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aegean/10 text-xs font-semibold text-aegean">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl bg-foam/60 px-4 py-3 text-xs text-aegean">
            💡 Αν αλλάξετε domain αργότερα, ξανακατεβάστε και επανεκτυπώστε τις κάρτες — το QR δείχνει στο guest link.
          </div>
        </DashboardCard>

        {/* Rooms placeholder */}
        <DashboardCard title="Δωμάτια" icon={DoorClosed}>
          <div className="rounded-xl border border-dashed border-sea/20 bg-sand/30 px-4 py-8 text-center">
            <DoorClosed className="mx-auto h-8 w-8 text-sea/25" />
            <p className="mt-2 text-sm font-medium text-sea/70">Ανά-δωμάτιο QR (σύντομα)</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-sea/45">
              Σύντομα θα μπορείτε να δημιουργείτε ξεχωριστό QR ανά δωμάτιο, ώστε τα αιτήματα να φτάνουν με τον αριθμό δωματίου.
            </p>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
