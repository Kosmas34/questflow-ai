# Guest Chat — Manual Test Checklist

Μετά το fix, δοκίμασε τα παρακάτω στη σελίδα επισκέπτη (`/guest/<slug>`).
Χρησιμοποίησε το demo κατάλυμα (κουμπί «Φόρτωσε demo» στο dashboard) ή ένα
δικό σου με WiFi, check-in/out, κανόνες και μερικά knowledge items.

Στο development, άνοιξε το terminal που τρέχει `npm run dev` — για κάθε
μήνυμα θα δεις logs:
```
[guest-chat] property loaded: yes
[guest-chat] knowledge items count: 12
[guest-chat] detected intent: wifi
[guest-chat] deterministic handler used: yes | AI call used: no
```

## Deterministic handlers (χωρίς AI — απαντούν αμέσως)

| # | Ερώτηση | Αναμενόμενο | intent / handler |
|---|---------|-------------|------------------|
| 1 | **WiFi (EN)**: "What is the WiFi password?" | `WiFi network: <name>. Password: <pass>.` | wifi / yes |
| 2 | **WiFi (EL)**: "Ποιος είναι ο κωδικός WiFi;" | `Το WiFi είναι: <name>. Ο κωδικός είναι: <pass>.` | wifi / yes |
| 3 | **Checkout (EN)**: "What time is checkout?" | `Check-out is until 11:00.` | checkout / yes |
| 4 | **Checkout (EL)**: "Τι ώρα είναι το check-out;" | `Το check-out είναι έως τις 11:00.` | checkout / yes |
| 5 | **Check-in (EL)**: "Τι ώρα η άφιξη;" | `Το check-in είναι από τις 15:00.` | checkin / yes |
| 6 | **House rules (EN)**: "Is smoking allowed?" | Απάντηση με το περιεχόμενο των κανόνων | rules / yes |
| 7 | **Phone (EL)**: "Ποιο είναι το τηλέφωνο επικοινωνίας;" | `Μπορείτε να επικοινωνήσετε στο <phone>.` | phone / yes |
| 8 | **Emergency (EN)**: "What's the emergency number?" | `For emergencies, please call: <contact>.` | emergency / yes |

Έλεγξε: intent σωστό, **AI call used: no**, απάντηση στη σωστή γλώσσα.

## Knowledge base μέσω AI (φυσική απάντηση, όχι στεγνή)

| # | Ερώτηση | Αναμενόμενο | AI call |
|---|---------|-------------|---------|
| 9 | **Parking (EL)**: "Πού μπορώ να παρκάρω;" | Φυσική απάντηση από το knowledge item για πάρκινγκ — **όχι** "δεν έχω την πληροφορία" | yes |
| 10 | **Beaches (EN)**: "Which beaches are close?" | Προτάσεις από τα knowledge items | yes |
| 11 | **Rephrased**: "I want to connect my laptop to the internet" | Δίνει το WiFi (μέσω handler ή AI) — **όχι** fallback | wifi/yes ή AI |
| 12 | **Food (EL)**: "Πού να φάμε απόψε;" | Προτάσεις εστιατορίων από knowledge, φυσικά | yes |

Έλεγξε: **καμία** απάντηση "Δεν έχω αυτή την πληροφορία" όταν υπάρχει σχετικό
knowledge item. Η απάντηση δεν λέει "σύμφωνα με τη βάση γνώσης".

## Missing info (soft fallback + αίτημα)

| # | Ερώτηση | Αναμενόμενο |
|---|---------|-------------|
| 13 | **Taxi (EN) όταν ΔΕΝ υπάρχει σχετικό knowledge**: "Can you book me a taxi to the airport at 9am?" | Δημιουργείται αίτημα + επιβεβαίωση ("...forwarded to the property team...") |
| 14 | **Άγνωστο (EL)**: "Υπάρχει ελικοδρόμιο;" | `Δεν το έχω καταχωρημένο αυτή τη στιγμή. Μπορώ όμως να ενημερώσω την ομάδα του καταλύματος...` |
| 15 | **Άγνωστο (EN)**: "Do you have a helicopter pad?" | `I don't have that detail saved yet, but I can notify the property team so they can help you.` |

Έλεγξε: το νέο, πιο ανθρώπινο fallback (όχι το παλιό στεγνό).

## Regression (να μη σπάσανε)

- [ ] Χαιρετισμός "Γεια σας" → φιλική απάντηση, όχι fallback.
- [ ] "Ευχαριστώ" → "Παρακαλώ! ...".
- [ ] Το αίτημα για πετσέτες ("Θέλω πετσέτες") εμφανίζεται στο dashboard → Αιτήματα.
- [ ] Rate limiting: >20 μηνύματα/5' από ίδιο IP → φιλικό "slow down" μήνυμα.
- [ ] Αν κόψεις το `AI_API_KEY`: handlers (WiFi/checkout/κλπ) δουλεύουν κανονικά·
      οι AI-dependent ερωτήσεις γυρίζουν το soft fallback αντί να σκάνε.

## Πώς το τρέχω

```bash
npm install
npm run dev
# άνοιξε http://localhost:3000, login, "Φόρτωσε demo κατάλυμα",
# μετά άνοιξε το guest link του demo και δοκίμασε τον πίνακα παραπάνω.

npm test   # 62 unit tests, incl. handlers
```
