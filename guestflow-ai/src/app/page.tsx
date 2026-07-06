import Link from "next/link";
import {
  QrCode,
  MessageCircle,
  Bell,
  BarChart3,
  Wifi,
  Clock,
  MapPin,
  Languages,
} from "lucide-react";

// Landing page. The hero is a live mock of the guest chat — the product
// itself is the most convincing visual.
export default function LandingPage() {
  return (
    <main>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-sea text-shore">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <p className="mb-4 inline-block rounded-full border border-gold/40 px-4 py-1 text-sm tracking-wide text-gold">
              GuestFlow AI
            </p>
            <h1 className="font-display text-4xl leading-tight md:text-5xl">
              Ο AI concierge του καταλύματός σας, διαθέσιμος 24/7
            </h1>
            <p className="mt-5 max-w-md text-lg text-shore/80">
              Οι επισκέπτες σκανάρουν ένα QR και παίρνουν άμεσες απαντήσεις για
              WiFi, check-in, checkout, οδηγίες, προτάσεις και αιτήματα.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/login" className="btn-primary bg-gold text-sea hover:bg-gold/90">
                Δημιούργησε το πρώτο σου κατάλυμα
              </Link>
              <Link
                href="/login"
                className="btn-secondary border-shore/30 bg-transparent text-shore hover:border-gold hover:text-gold"
              >
                Σύνδεση
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-shore/60">
              <span className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-gold" /> Ελληνικά & Αγγλικά
              </span>
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-gold" /> Χωρίς εγκατάσταση για τον επισκέπτη
              </span>
            </div>
          </div>

          {/* Live-looking guest chat mock */}
          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-[2rem] border border-shore/15 bg-shore p-4 text-sea shadow-lift">
              <div className="mb-3 rounded-2xl bg-sea px-4 py-3 text-shore">
                <p className="font-display text-lg">Sunset Villa Santorini</p>
                <p className="text-xs text-shore/70">Ψηφιακός βοηθός · Οία</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-aegean px-4 py-2 text-white">
                  Ποιος είναι ο κωδικός WiFi;
                </div>
                <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-foam px-4 py-2">
                  Δίκτυο: <b>SunsetVilla_5G</b> · Κωδικός: <b>caldera2026</b>.
                  Καλύπτει και τη βεράντα ☀️
                </div>
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-aegean px-4 py-2 text-white">
                  Χρειαζόμαστε πετσέτες
                </div>
                <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-foam px-4 py-2">
                  Ενημέρωσα τον ιδιοκτήτη — θα σας φέρει καθαρές πετσέτες
                  σύντομα. ✓
                </div>
              </div>
              <div className="mt-3 flex gap-2 overflow-hidden">
                {["WiFi", "Check-out", "Ταξί", "Παραλίες"].map((c) => (
                  <span
                    key={c}
                    className="whitespace-nowrap rounded-full border border-sea/15 px-3 py-1 text-xs text-sea/70"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* wave into the light section */}
        <svg className="wave-divider text-shore" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden>
          <path fill="currentColor" d="M0,32 C240,64 480,0 720,16 C960,32 1200,64 1440,32 L1440,60 L0,60 Z" />
        </svg>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl">Πώς λειτουργεί</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: QrCode,
              title: "Σκανάρει το QR",
              text: "Ο επισκέπτης σκανάρει την κάρτα στο δωμάτιο. Δεν κατεβάζει τίποτα — ανοίγει απλώς μια σελίδα.",
            },
            {
              icon: MessageCircle,
              title: "Ρωτάει ό,τι θέλει",
              text: "WiFi, checkout, παραλίες, ταβέρνες, ταξί. Ο βοηθός απαντά μόνο με βάση τις δικές σας πληροφορίες.",
            },
            {
              icon: Bell,
              title: "Εσείς ενημερώνεστε",
              text: "«Θέλω πετσέτες», «θέλω late checkout» — κάθε αίτημα εμφανίζεται αμέσως στο dashboard σας.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <Icon className="h-8 w-8 text-aegean" />
              <h3 className="mt-4 font-display text-xl">{title}</h3>
              <p className="mt-2 text-sea/70">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FEATURES STRIP ---------- */}
      <section className="bg-sand">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Wifi, t: "Όλες οι πληροφορίες σε ένα σημείο", d: "WiFi, κανόνες, οδηγίες πρόσβασης, επαφές έκτακτης ανάγκης." },
            { icon: Clock, t: "Λιγότερα μηνύματα στις 11 το βράδυ", d: "Ο βοηθός απαντά τις επαναλαμβανόμενες ερωτήσεις αντί για εσάς." },
            { icon: MapPin, t: "Οι δικές σας προτάσεις", d: "Παραλίες, φαγητό, ποτό, φαρμακείο — ό,τι προτείνετε εσείς." },
            { icon: BarChart3, t: "Analytics", d: "Δείτε τι ρωτάνε οι επισκέπτες και βελτιώστε τη διαμονή τους." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t}>
              <Icon className="h-6 w-6 text-aegean" />
              <h3 className="mt-3 font-medium">{t}</h3>
              <p className="mt-1 text-sm text-sea/70">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="font-display text-3xl">
          Έτοιμο για το κατάλυμά σας σε 10 λεπτά
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sea/70">
          Δημιουργήστε λογαριασμό, συμπληρώστε τις πληροφορίες του καταλύματος
          και τυπώστε την κάρτα QR για το δωμάτιο.
        </p>
        <Link href="/login" className="btn-primary mt-8">
          Δημιούργησε το πρώτο σου κατάλυμα
        </Link>
      </section>

      <footer className="border-t border-sea/10 py-8 text-center text-sm text-sea/50">
        GuestFlow AI · AI concierge για ελληνικά καταλύματα
      </footer>
    </main>
  );
}
