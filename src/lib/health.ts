// Knowledge Health & GuestFlow AI Insights.
// Both are DETERMINISTIC — computed from the owner's actual data,
// no AI calls. Pure functions, unit-tested.

import { KNOWLEDGE_CATEGORY_LABELS, type KnowledgeCategory } from "@/lib/types";

// ---------------------------------------------------------------
// Knowledge Health: how complete is a property's setup?
// ---------------------------------------------------------------

export interface HealthCheck {
  key: string;
  label: string;
  done: boolean;
}

export interface KnowledgeHealth {
  percent: number;
  checks: HealthCheck[];
  missing: HealthCheck[];
}

interface HealthPropertyFields {
  wifi_name: string;
  wifi_password: string;
  house_rules: string;
  access_instructions: string;
  phone: string;
  emergency_contact: string;
  welcome_message?: string;
}

/** Knowledge categories that matter for a complete guest experience. */
const HEALTH_CATEGORIES: KnowledgeCategory[] = [
  "transport",
  "parking",
  "beaches",
  "food",
  "supermarket",
  "pharmacy",
];

export function computeKnowledgeHealth(
  property: HealthPropertyFields,
  presentCategories: Set<string>
): KnowledgeHealth {
  const checks: HealthCheck[] = [
    {
      key: "wifi",
      label: "WiFi",
      done: !!(property.wifi_name.trim() && property.wifi_password.trim()),
    },
    { key: "rules", label: "Κανόνες σπιτιού", done: !!property.house_rules.trim() },
    {
      key: "access",
      label: "Οδηγίες πρόσβασης",
      done: !!property.access_instructions.trim(),
    },
    { key: "phone", label: "Τηλέφωνο", done: !!property.phone.trim() },
    {
      key: "emergency",
      label: "Emergency contact",
      done: !!property.emergency_contact.trim(),
    },
    {
      key: "welcome",
      label: "Μήνυμα καλωσορίσματος",
      done: !!(property.welcome_message ?? "").trim(),
    },
    ...HEALTH_CATEGORIES.map((c) => ({
      key: c,
      label: KNOWLEDGE_CATEGORY_LABELS[c],
      done: presentCategories.has(c),
    })),
  ];

  const done = checks.filter((c) => c.done).length;
  const percent = Math.round((done / checks.length) * 100);
  return { percent, checks, missing: checks.filter((c) => !c.done) };
}

// ---------------------------------------------------------------
// AI Insights: suggestions derived from what guests actually ask
// versus what knowledge/buttons the owner has.
// ---------------------------------------------------------------

export interface Insight {
  id: string;
  text: string;
  actionLabel?: string;
}

/** topic → knowledge category it needs. */
const TOPIC_TO_CATEGORY: Record<string, KnowledgeCategory> = {
  transport: "transport",
  parking: "parking",
  beaches: "beaches",
  food: "food",
  drinks: "drinks",
  supermarket: "supermarket",
  pharmacy: "pharmacy",
  rules: "rules",
};

const TOPIC_LABELS: Record<string, string> = {
  transport: "μετακινήσεις και ταξί",
  parking: "πάρκινγκ",
  beaches: "παραλίες",
  food: "εστιατόρια",
  drinks: "καφέ και ποτό",
  supermarket: "σούπερ μάρκετ",
  pharmacy: "φαρμακείο",
  rules: "τους κανόνες",
};

/** topic → quick button it maps to (when knowledge exists but button is off). */
const TOPIC_TO_BUTTON: Record<string, { key: string; label: string }> = {
  transport: { key: "taxi", label: "Ταξί" },
  food: { key: "restaurants", label: "Εστιατόρια" },
  beaches: { key: "beaches", label: "Παραλίες" },
};

const FREQUENT_THRESHOLD = 3;

export function computeInsights(
  topicCounts: Record<string, number>,
  presentCategories: Set<string>,
  enabledQuickButtons: Set<string>,
  maxInsights = 4
): Insight[] {
  const insights: Insight[] = [];
  const sortedTopics = Object.entries(topicCounts)
    .filter(([topic, count]) => topic !== "other" && count >= FREQUENT_THRESHOLD)
    .sort((a, b) => b[1] - a[1]);

  for (const [topic] of sortedTopics) {
    const category = TOPIC_TO_CATEGORY[topic];
    const label = TOPIC_LABELS[topic] ?? topic;

    // Guests ask about it but there's NO knowledge → add info.
    if (category && !presentCategories.has(category)) {
      insights.push({
        id: `add-${category}`,
        text: `Οι επισκέπτες ρωτούν συχνά για ${label}.`,
        actionLabel: `Προσθήκη πληροφοριών: ${KNOWLEDGE_CATEGORY_LABELS[category]}`,
      });
      continue;
    }

    // Knowledge exists but the matching quick button is off → enable it.
    const btn = TOPIC_TO_BUTTON[topic];
    if (btn && category && presentCategories.has(category) && !enabledQuickButtons.has(btn.key)) {
      insights.push({
        id: `button-${btn.key}`,
        text: `Οι επισκέπτες ρωτούν συχνά για ${label}.`,
        actionLabel: `Ενεργοποίηση quick button: ${btn.label}`,
      });
    }
  }

  // General nudge: activity but zero FAQ entries.
  const totalQuestions = Object.values(topicCounts).reduce((a, b) => a + b, 0);
  if (totalQuestions >= FREQUENT_THRESHOLD && !presentCategories.has("faq")) {
    insights.push({
      id: "add-faq",
      text: "Δεν υπάρχουν ακόμη Συχνές ερωτήσεις (FAQ).",
      actionLabel: "Προσθήκη FAQ",
    });
  }

  return insights.slice(0, maxInsights);
}
