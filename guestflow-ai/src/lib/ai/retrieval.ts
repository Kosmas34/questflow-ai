// Retrieval layer for safer AI grounding.
//
// Before any AI call we select ONLY the knowledge items relevant to the
// guest's message. If nothing relevant exists, we answer with the fallback
// sentence WITHOUT calling the AI at all — no credits spent, no chance of
// hallucination.

import { normalize, detectTopic } from "./intent";

export interface RetrievableItem {
  category: string;
  title: string;
  content: string;
}

/** Words too short/common to count as evidence of relevance. */
const STOPWORDS = new Set([
  // Greek
  "ειναι", "εχει", "εχω", "θελω", "μπορω", "μπορει", "ποιος", "ποια", "ποιο",
  "πως", "τι", "που", "οταν", "για", "απο", "στο", "στη", "στην", "στον",
  "και", "ή", "να", "το", "τα", "την", "τον", "της", "του", "των", "με",
  "σας", "μας", "μου", "ενα", "μια", "καποιο", "υπαρχει", "υπαρχουν", "κοντα",
  // English
  "the", "a", "an", "is", "are", "was", "were", "what", "which", "where",
  "when", "how", "can", "could", "would", "should", "do", "does", "did",
  "you", "your", "there", "here", "this", "that", "for", "and", "or", "to",
  "of", "in", "on", "at", "we", "our", "any", "some", "near", "nearby",
  "have", "has", "want", "need", "please", "get", "time",
]);

/** Tokenize a normalized string into significant words. */
export function significantTokens(raw: string): string[] {
  return normalize(raw)
    .replace(/[^a-zα-ω0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/** Greetings / thanks / goodbyes get a canned reply — no AI, no fallback. */
export function detectSmallTalk(raw: string): "greeting" | "thanks" | null {
  const t = normalize(raw).trim();
  if (/^(γεια( σας| σου)?|καλημερα|καλησπερα|καληνυχτα|hello|hi|hey|good (morning|evening|afternoon))[\s!.]*$/.test(t))
    return "greeting";
  if (/^(ευχαριστω( πολυ)?|thanks|thank you|thx|ty|σε ευχαριστω)[\s!.]*$/.test(t))
    return "thanks";
  return null;
}

/**
 * Converts the property's structured fields into pseudo knowledge items,
 * so questions like "what time is checkout?" work even with an empty
 * knowledge base.
 */
export function propertyPseudoItems(property: {
  checkin_time: string;
  checkout_time: string;
  wifi_name: string;
  wifi_password: string;
  house_rules: string;
  access_instructions: string;
  phone: string;
  emergency_contact: string;
}): RetrievableItem[] {
  const items: RetrievableItem[] = [];
  if (property.wifi_name || property.wifi_password) {
    items.push({
      category: "wifi",
      title: "WiFi",
      content: `Δίκτυο WiFi: ${property.wifi_name || "-"} — Κωδικός: ${property.wifi_password || "-"}`,
    });
  }
  items.push({
    category: "checkin_checkout",
    title: "Check-in / Check-out",
    content: `Check-in από ${property.checkin_time}. Check-out έως ${property.checkout_time}.`,
  });
  if (property.house_rules) {
    items.push({ category: "rules", title: "Κανόνες", content: property.house_rules });
  }
  if (property.access_instructions) {
    items.push({
      category: "faq",
      title: "Οδηγίες πρόσβασης",
      content: property.access_instructions,
    });
  }
  if (property.phone || property.emergency_contact) {
    items.push({
      category: "faq",
      title: "Επικοινωνία",
      content: `Τηλέφωνο ιδιοκτήτη: ${property.phone || "-"}. Έκτακτη ανάγκη: ${property.emergency_contact || "-"}`,
    });
  }
  return items;
}

/**
 * Scores each item against the guest message:
 *  +3 if the item's category matches the detected topic
 *  +2 per token that appears in the title
 *  +1 per token that appears in the content
 * Returns items with score > 0, best first, capped at `maxItems`.
 */
export function findRelevantItems(
  message: string,
  items: RetrievableItem[],
  maxItems = 6
): RetrievableItem[] {
  const topic = detectTopic(message);
  const tokens = significantTokens(message);

  const scored = items
    .map((item) => {
      let score = 0;
      if (topic !== "other" && item.category === topic) score += 3;
      const title = normalize(item.title);
      const content = normalize(item.content);
      for (const tok of tokens) {
        if (title.includes(tok)) score += 2;
        else if (content.includes(tok)) score += 1;
      }
      return { item, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxItems).map((s) => s.item);
}
