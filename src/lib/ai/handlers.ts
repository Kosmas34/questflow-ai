// Deterministic answer handlers for the guest chat.
// These run BEFORE the AI call: if a guest asks something we can answer
// straight from the property's core fields, we reply instantly, in the
// guest's language, with no AI cost and zero chance of hallucination.
//
// If a handler has no data (e.g. the owner never set a phone), it returns
// null and the pipeline falls through to the AI, which sees the full
// context and can still help.

import { normalize } from "./intent";
import type { GuestLang } from "@/lib/i18n";

export interface HandlerProperty {
  name: string;
  checkin_time: string;
  checkout_time: string;
  wifi_name: string;
  wifi_password: string;
  house_rules: string;
  access_instructions: string;
  phone: string;
  emergency_contact: string;
}

export type HandlerIntent =
  | "wifi"
  | "checkin"
  | "checkout"
  | "phone"
  | "emergency"
  | "rules"
  | "access";

export interface HandlerResult {
  intent: HandlerIntent;
  answer: string;
}

/** Detects a core intent from the guest message (Greek + English, accent-insensitive). */
export function detectCoreIntent(raw: string): HandlerIntent | null {
  const t = normalize(raw);

  // WiFi / internet / password / κωδικός
  if (/(wifi|wi-fi|wi fi|internet|ιντερνετ|δικτυο|κωδικο|κωδικος|password|pass\b)/.test(t))
    return "wifi";

  // Emergency (check before generic phone, since "emergency number" contains "number")
  if (/(εκτακτη|εκτακτης|επειγον|emergency|ambulance|ασθενοφορο|αστυνομια|police|urgent)/.test(t))
    return "emergency";

  // Check-out (check before check-in: "checkout" must not match a generic "check")
  if (/(check-?out|check ?out|τσεκ ?αουτ|αναχωρηση|φευγουμε|φυγουμε|ωρα που φευγ|παραδοση δωματ)/.test(t))
    return "checkout";

  // Check-in
  if (/(check-?in|check ?in|τσεκ ?ιν|αφιξη|ελευση|ωρα που ερχ|ποτε μπορω να ερθ|ποτε γινεται η αφιξ|arrival)/.test(t))
    return "checkin";

  // Access / how to get in / keys / lockbox
  if (/(πως θα μπω|πως μπαινω|κλειδι|κλειδοθηκη|lockbox|κωδικος πορτας|access|entrance|how (do|to) (i )?get in|directions|πως θα ερθω|πως φτανω)/.test(t))
    return "access";

  // House rules
  if (/(κανον|rules|επιτρεπεται|επιτρεπονται|allowed|καπνισμα|smoking|pets|κατοικιδ|παρτι|party|ησυχια|quiet)/.test(t))
    return "rules";

  // Contact phone
  if (/(τηλεφωνο|phone|call|καλεσω|επικοινων|contact|number|νουμερο|reception|ρεσεψιον|ιδιοκτητ|host|owner)/.test(t))
    return "phone";

  return null;
}

/**
 * Produces a direct answer for a core intent, or null if the property
 * lacks the data (→ fall through to AI).
 */
export function handleCoreIntent(
  intent: HandlerIntent,
  property: HandlerProperty,
  language: GuestLang
): string | null {
  const el = language === "el";

  switch (intent) {
    case "wifi": {
      if (!property.wifi_name && !property.wifi_password) return null;
      if (property.wifi_name && property.wifi_password) {
        return el
          ? `Το WiFi είναι: ${property.wifi_name}. Ο κωδικός είναι: ${property.wifi_password}.`
          : `WiFi network: ${property.wifi_name}. Password: ${property.wifi_password}.`;
      }
      if (property.wifi_name) {
        return el
          ? `Το δίκτυο WiFi είναι: ${property.wifi_name}.`
          : `The WiFi network is: ${property.wifi_name}.`;
      }
      return el
        ? `Ο κωδικός WiFi είναι: ${property.wifi_password}.`
        : `The WiFi password is: ${property.wifi_password}.`;
    }

    case "checkin": {
      if (!property.checkin_time) return null;
      return el
        ? `Το check-in είναι από τις ${property.checkin_time}.`
        : `Check-in is from ${property.checkin_time}.`;
    }

    case "checkout": {
      if (!property.checkout_time) return null;
      return el
        ? `Το check-out είναι έως τις ${property.checkout_time}.`
        : `Check-out is until ${property.checkout_time}.`;
    }

    case "phone": {
      if (!property.phone) return null;
      return el
        ? `Μπορείτε να επικοινωνήσετε στο ${property.phone}.`
        : `You can reach the property at ${property.phone}.`;
    }

    case "emergency": {
      // Prefer the dedicated emergency contact; fall back to the main phone.
      const contact = property.emergency_contact || property.phone;
      if (!contact) return null;
      return el
        ? `Για έκτακτη ανάγκη, καλέστε: ${contact}.`
        : `For emergencies, please call: ${contact}.`;
    }

    case "rules": {
      if (!property.house_rules) return null;
      return el
        ? `Οι κανόνες του καταλύματος: ${property.house_rules}`
        : `The house rules: ${property.house_rules}`;
    }

    case "access": {
      if (!property.access_instructions) return null;
      return el
        ? `Οδηγίες πρόσβασης: ${property.access_instructions}`
        : `Access instructions: ${property.access_instructions}`;
    }

    default:
      return null;
  }
}
