// Lightweight, deterministic intent + topic detection for guest messages.
// Runs before/alongside the AI call so requests are created reliably
// even if the AI provider is down.

/** Lowercase and strip Greek accents so "πετσέτες" matches "πετσετες". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface DetectedRequest {
  category: "housekeeping" | "issue" | "taxi" | "late_checkout" | "help";
}

/** Returns a request category if the message should open a guest request. */
export function detectRequest(raw: string): DetectedRequest | null {
  const t = normalize(raw);

  const wants = /(θελω|θελουμε|χρειαζομαι|χρειαζομαστε|μπορειτε|μπορει να|i need|we need|i want|we want|can you|could you|please|book|call|καλεστε|φερτε|στειλτε)/;

  // Late checkout — check before generic checkout/taxi rules.
  if ((t.includes("late") && t.includes("check")) || t.includes("αργο checkout") || (t.includes("checkout") && /(αργοτερα|πιο αργα|παραταση)/.test(t)))
    return { category: "late_checkout" };

  // Towels / housekeeping supplies.
  if (/(πετσετ|towel|σεντον|linen|χαρτι υγειας|toilet paper|καθαριοτητ|cleaning|σαπουνι|soap)/.test(t) && (wants.test(t) || /(τελειωσ|δεν εχ|ran out|no more)/.test(t)))
    return { category: "housekeeping" };

  // Something is broken / a problem.
  if (/(προβλημα|problem|χαλασε|δεν λειτουργ|δεν δουλευ|broken|not working|leak|διαρροη|βλαβη|issue)/.test(t))
    return { category: "issue" };

  // Taxi / transfer booking.
  if (/(ταξι|taxi|transfer|μεταφορα στο αεροδρομιο)/.test(t) && wants.test(t))
    return { category: "taxi" };

  // Explicit ask for help.
  if (/(need help|βοηθεια|help me|βοηθηστε|i need assistance)/.test(t))
    return { category: "help" };

  return null;
}

/** Classifies the message topic for analytics. */
export function detectTopic(raw: string): string {
  const t = normalize(raw);
  if (/(wifi|wi-fi|internet|ιντερνετ|κωδικο δικτυου)/.test(t)) return "wifi";
  if (/(check-?in|check-?out|τσεκ ιν|τσεκ αουτ|αναχωρηση|αφιξη)/.test(t)) return "checkin_checkout";
  if (/(ταξι|taxi|λεωφορει|bus|transfer|μετακινηση|μεταφορα)/.test(t)) return "transport";
  if (/(παρκ|parking|σταθμευσ)/.test(t)) return "parking";
  if (/(παραλι|beach|μπανιο στη θαλασσα|θαλασσα)/.test(t)) return "beaches";
  if (/(φαγητο|εστιατορι|ταβερν|restaurant|food|eat|dinner|lunch|φαμε)/.test(t)) return "food";
  if (/(ποτο|μπαρ|bar|drink|cocktail|καφε|coffee|cafe)/.test(t)) return "drinks";
  if (/(σουπερ ?μαρκετ|supermarket|mini ?market|ψωνια|grocer)/.test(t)) return "supermarket";
  if (/(φαρμακει|pharmacy|γιατρο|doctor|φαρμακο)/.test(t)) return "pharmacy";
  if (/(κανον|rules|επιτρεπ|allowed|καπνισμα|smoking|ησυχια)/.test(t)) return "rules";
  return "other";
}
