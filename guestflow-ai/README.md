# GuestFlow AI

AI concierge για μικρά ξενοδοχεία, Airbnb hosts, βίλες και τουριστικά καταλύματα.
Ο επισκέπτης σκανάρει ένα QR στο δωμάτιο και μιλάει με έναν ψηφιακό βοηθό που
απαντά **μόνο** με βάση τις πληροφορίες του ιδιοκτήτη — WiFi, check-in/out,
οδηγίες, παραλίες, φαγητό, αιτήματα.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · OpenAI-compatible AI provider

---

## 1. Εγκατάσταση (τοπικά)

### Προαπαιτούμενα
- Node.js 18+
- Λογαριασμός [Supabase](https://supabase.com) (δωρεάν tier αρκεί)
- API key από OpenAI **ή** οποιονδήποτε OpenAI-compatible provider (Groq, Together, Mistral, τοπικό Ollama)

### Βήματα

```bash
# 1. Εγκατάσταση dependencies
npm install

# 2. Ρύθμιση environment
cp .env.example .env.local
# Άνοιξε το .env.local και συμπλήρωσε τα κλειδιά (βλ. παρακάτω)

# 3. Εκκίνηση
npm run dev
# → http://localhost:3000
```

### Ρύθμιση Supabase

1. Δημιούργησε νέο project στο [supabase.com](https://supabase.com).
2. **SQL Editor** → επικόλλησε ολόκληρο το `supabase/schema.sql` → Run.
   (Δημιουργεί tables, RLS policies και τη function του demo.)
   Αν είχες τρέξει παλαιότερη έκδοση του schema, τρέξε και το
   `supabase/migrations/001_secure_demo_function.sql`.
3. **Project Settings → API** → αντίγραψε στα αντίστοιχα πεδία του `.env.local`:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ *μόνο server-side, μην το βάλεις ποτέ σε NEXT_PUBLIC_*
4. **Authentication → Providers → Email**: για γρήγορο τοπικό testing μπορείς
   να απενεργοποιήσεις το "Confirm email" ώστε το signup να συνδέει αμέσως.

### Ρύθμιση AI provider

Στο `.env.local`:

```env
AI_BASE_URL=https://api.openai.com/v1   # ή π.χ. https://api.groq.com/openai/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini                    # ή llama-3.1-70b-versatile κ.λπ.
```

Οποιοδήποτε endpoint μιλάει το OpenAI chat-completions format δουλεύει
χωρίς αλλαγή κώδικα (`src/lib/ai/provider.ts`).

### Demo data

Μετά το πρώτο login, στο dashboard πάτησε **«Φόρτωσε demo κατάλυμα»** —
δημιουργείται το *Sunset Villa Santorini* με πλήρη βάση γνώσης, ιστορικό
14 ημερών και 3 αιτήματα, ώστε η εφαρμογή να φαίνεται γεμάτη.

---

## 2. Deployment (Vercel)

1. Ανέβασε το repo στο GitHub.
2. [vercel.com](https://vercel.com) → **New Project** → import το repo (auto-detect Next.js).
3. **Environment Variables**: πρόσθεσε όλα τα κλειδιά του `.env.local`
   και όρισε `NEXT_PUBLIC_APP_URL` στο production URL
   (π.χ. `https://guestflow.vercel.app`) — **αυτό μπαίνει μέσα στα QR codes**.
4. Deploy. ✅

> Αν αλλάξεις domain αργότερα, ξανατύπωσε τις κάρτες QR (τα QR δείχνουν στο
> `NEXT_PUBLIC_APP_URL/guest/<slug>`).

---

## 3. Δομή φακέλων

```
guestflow-ai/
├── supabase/
│   └── schema.sql              # Tables, RLS, indexes, demo seed function
├── src/
│   ├── middleware.ts           # Session refresh + προστασία /dashboard
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── login/              # Auth (sign in / sign up)
│   │   ├── dashboard/
│   │   │   ├── page.tsx        # Επισκόπηση (stats, top ερωτήσεις, ανοιχτά αιτήματα)
│   │   │   ├── properties/     # Λίστα, δημιουργία, διαχείριση καταλύματος
│   │   │   ├── requests/       # Αιτήματα επισκεπτών (νέο → σε εξέλιξη → ολοκληρώθηκε)
│   │   │   └── analytics/      # Θέματα, γλώσσες, αιτήματα, χρήση/ημέρα
│   │   ├── guest/[slug]/       # Δημόσια σελίδα επισκέπτη (chat)
│   │   └── api/
│   │       ├── guest/session/  # Δημιουργία guest session (1 ανά σκανάρισμα)
│   │       ├── guest/chat/     # Το AI chat + request detection + logging
│   │       ├── properties/[id]/qr/       # QR PNG
│   │       ├── properties/[id]/qr-card/  # Εκτυπώσιμη κάρτα PDF (A6)
│   │       └── demo/           # Seed demo καταλύματος
│   ├── components/             # PropertyForm, KnowledgeBase, GuestChat, QrSection…
│   └── lib/
│       ├── supabase/           # client (browser) / server (RLS) / admin (service role)
│       ├── ai/provider.ts      # OpenAI-compatible abstraction
│       ├── ai/intent.ts        # Request & topic detection (EL/EN, χωρίς τόνους)
│       ├── i18n.ts             # Strings guest σελίδας (ΕΛ/EN)
│       └── types.ts            # Κοινά types & labels
```

## 4. Αρχιτεκτονικές αποφάσεις (σύντομα)

- **Ασφάλεια δεδομένων:** Οι ιδιοκτήτες γράφουν/διαβάζουν μέσω RLS
  (`owner_id = auth.uid()`). Οι ανώνυμοι επισκέπτες δεν αγγίζουν ποτέ τη
  βάση απευθείας — περνούν από API routes που χρησιμοποιούν το service-role
  key server-side.
- **Grounded AI:** Το system prompt περιέχει *μόνο* τα δεδομένα του
  καταλύματος και εντολή για την ακριβή fallback φράση όταν δεν υπάρχει
  απάντηση. Temperature 0.3.
- **Αξιόπιστα requests:** Η ανίχνευση αιτημάτων (πετσέτες, πρόβλημα, ταξί,
  late checkout, βοήθεια) γίνεται ντετερμινιστικά με keywords (EL/EN, με
  αφαίρεση τόνων) *πριν* το AI call — άρα δουλεύει ακόμη κι αν πέσει ο
  AI provider.
- **Analytics χωρίς βιβλιοθήκες:** Απλά aggregations σε server components +
  CSS bars. Καμία εξάρτηση από chart libraries.
- **Γλώσσες:** v1 = Ελληνικά/Αγγλικά. Νέα γλώσσα = προσθήκη στο
  `src/lib/i18n.ts` + στη λίστα γλωσσών του καταλύματος.

## 5. Production hardening (τι περιλαμβάνεται)

- **Rate limiting** στα guest endpoints (`src/lib/rate-limit.ts`): όρια ανά IP,
  ανά session και ανά κατάλυμα στο chat, και ανά IP/κατάλυμα στη δημιουργία
  sessions. Φιλικό μήνυμα (ΕΛ/EN) όταν ξεπεραστούν. In-memory ανά instance —
  αν αργότερα χρειαστείς global limits σε πολλά serverless instances,
  αντικαθιστάς τα εσωτερικά του `checkLimit` με Upstash/Vercel KV.
- **Session validation**: το `/api/guest/chat` επιβεβαιώνει ότι το session
  ανήκει στο κατάλυμα του slug (αλλιώς 403) — κανένα μήνυμα δεν γράφεται
  με ξένο session.
- **Ασφαλές demo**: η `create_demo_property()` δεν δέχεται πλέον owner uuid·
  δουλεύει πάντα με `auth.uid()`.
- **Email ειδοποιήσεις** σε νέο αίτημα (`src/lib/notify/email.ts`):
  console σε development, Resend/SendGrid σε production μέσω env — χωρίς
  αλλαγή κώδικα.
- **Retrieval-first grounding** (`src/lib/ai/retrieval.ts`): πριν από κάθε
  AI call επιλέγονται μόνο τα σχετικά knowledge items (topic + λέξεις,
  χωρίς τόνους). Αν δεν υπάρχει σχετική πληροφορία, επιστρέφεται η fallback
  φράση **χωρίς AI call**. Χαιρετισμοί/ευχαριστίες απαντώνται επίσης χωρίς AI.
- **Γλώσσα επισκέπτη**: αυτόματη επιλογή από τη γλώσσα του browser
  (ελληνικός browser → ελληνικά, αλλιώς αγγλικά), με χειροκίνητη αλλαγή.
- **Fonts χωρίς build dependency**: τα Google Fonts φορτώνουν runtime με
  `<link>` και υπάρχουν πλήρη system fallbacks — το `npm run build` περνάει
  και σε περιβάλλοντα χωρίς δίκτυο.
- **Dependencies**: Next 14.2.35 (τελευταίο 14.x — περιλαμβάνει το fix του
  critical CVE-2025-29927), Supabase SDK ενημερωμένο, postcss override.
  Σημείωση: το npm audit δείχνει ακόμη μία ομάδα advisories (DoS-class) του
  Next που διορθώνονται μόνο στο Next 16 — breaking αναβάθμιση που
  αποφεύχθηκε σκόπιμα για να μη σπάσει το App Router. Κανένα critical.

## 6. Tests

```bash
npm test
```

Καλύπτουν: ανίχνευση αιτημάτων (πετσέτες/πρόβλημα/ταξί/late checkout/βοήθεια,
ΕΛ/EN), ταξινόμηση θεμάτων, retrieval συμπεριφορά fallback (καμία σχετική
γνώση → κανένα AI call), pseudo-items από τα πεδία του καταλύματος,
small-talk, κανόνα session validation και rate limiter.

## 6b. AI Setup Wizard

Onboarding σε <5 λεπτά από το `/dashboard/wizard` (κύριο CTA στο dashboard):

1. **Κατάλυμα** — όνομα, τύπος, περιοχή, γλώσσες.
2. **Επικόλληση** — ο ιδιοκτήτης κάνει paste το μήνυμα που ήδη στέλνει
   στους επισκέπτες ή την περιγραφή από Airbnb/Booking.
3. **AI Ανάλυση** — το AI εξάγει δομημένα: check-in/out, WiFi, κανόνες,
   οδηγίες, τηλέφωνα, και knowledge items ανά κατηγορία (parking, παραλίες,
   φαγητό, ταξί, φαρμακείο, FAQ κ.λπ.). Εξάγει ΜΟΝΟ ό,τι υπάρχει στο
   κείμενο — δεν εφευρίσκει στοιχεία.
4. **Έλεγχος** — όλα επεξεργάσιμα. «Προτάσεις» για ό,τι λείπει
   (π.χ. «Δεν βρήκα πληροφορίες για Parking» → [Προσθήκη]) και
   [Generate Suggestions] για draft με [πλαίσια] που συμπληρώνει ο
   ιδιοκτήτης — ποτέ επινοημένα ονόματα/τηλέφωνα.
5. **Έτοιμο** — δημιουργούνται Knowledge Base, FAQ, Quick Actions,
   Welcome Message και QR με ένα κλικ.

Νέες στήλες: `properties.welcome_message`, `properties.quick_buttons`
(migration `002_wizard_columns.sql` για υπάρχουσες εγκαταστάσεις).
Endpoints: `/api/wizard/analyze`, `/api/wizard/suggest` (owner-auth,
rate-limited).

## 6c. Product Polish (enterprise-ready)

- **AI Confidence Scores**: κάθε εξαγόμενο πεδίο/πληροφορία στον wizard δείχνει
  ποσοστό βεβαιότητας· κάτω από 70% εμφανίζεται "Please verify this information."
- **Smart Merge**: δεύτερο import σε υπάρχον κατάλυμα (κουμπί «AI Import» στη
  σελίδα καταλύματος) δεν αντικαθιστά τίποτα σιωπηλά — panel "Already Existing
  Information" με Replace/Keep ανά πεδίο και Replace/Merge ανά κατηγορία.
- **Knowledge Health** widget στο dashboard: ποσοστό πληρότητας ανά κατάλυμα,
  λίστα με ό,τι λείπει, κουμπί "Complete Missing Sections".
- **GuestFlow AI Insights**: αυτόματες προτάσεις από τα πραγματικά δεδομένα
  (τι ρωτούν οι επισκέπτες vs τι γνώση/κουμπιά υπάρχουν) — deterministic,
  χωρίς AI κλήσεις.
- **Import Cache**: ίδιο κείμενο δύο φορές → sha256 cache, κανένα AI κόστος.
- **Loading experience**: φάσεις ανάλυσης με progress bar αντί για σκέτο spinner.
- **Premium empty states** με illustration, **toast notifications**, **loading
  skeletons** σε όλες τις dashboard σελίδες, micro-interactions (hover, active
  scale, fade-in, success pop) με σεβασμό στο prefers-reduced-motion.

## 7. Χρήσιμες εντολές

```bash
npm run dev         # development server
npm run build       # production build
npm run typecheck   # TypeScript έλεγχος χωρίς build
npm test            # unit tests (intent, retrieval, limits, validation)
```
