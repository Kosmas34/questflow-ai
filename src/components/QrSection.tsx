"use client";

import { useState } from "react";
import { Download, Link as LinkIcon, Check } from "lucide-react";

// QR panel on the property page: live preview (PNG endpoint),
// copy guest link, and "Download Room QR Card" (PDF endpoint).
export default function QrSection({ propertyId, slug }: { propertyId: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const guestUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/guest/${slug}`;

  async function copyLink() {
    await navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card sticky top-8 text-center">
      <h2 className="font-display text-xl">Room QR</h2>
      <p className="mt-1 text-sm text-sea/60">
        Οι επισκέπτες σκανάρουν και ανοίγει ο βοηθός.
      </p>

      {/* Live QR preview, generated server-side */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/properties/${propertyId}/qr`}
        alt={`QR code για /guest/${slug}`}
        width={200}
        height={200}
        className="mx-auto mt-4 rounded-xl border border-sea/10 bg-white p-2"
      />

      <div className="mt-5 space-y-3">
        <a
          href={`/api/properties/${propertyId}/qr-card`}
          className="btn-primary w-full"
          download
        >
          <Download className="h-4 w-4" /> Download Room QR Card
        </a>
        <button onClick={copyLink} className="btn-secondary w-full">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4" />}
          {copied ? "Αντιγράφηκε!" : "Αντιγραφή link"}
        </button>
      </div>

      <p className="mt-4 text-xs text-sea/50">
        Το PDF είναι έτοιμο για εκτύπωση σε A6 — ιδανικό για σταντ ή κορνίζα
        στο δωμάτιο.
      </p>
    </div>
  );
}
