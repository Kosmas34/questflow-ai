import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findRelevantItems,
  propertyPseudoItems,
  detectSmallTalk,
  significantTokens,
  type RetrievableItem,
} from "../src/lib/ai/retrieval";

const KB: RetrievableItem[] = [
  { category: "wifi", title: "WiFi", content: "Δίκτυο: Villa_5G — Κωδικός: sea2026" },
  { category: "beaches", title: "Παραλίες", content: "Κατακόλυμπο 15 λεπτά περπάτημα. Αμμούδι 214 σκαλιά." },
  { category: "food", title: "Φαγητό", content: "Roka για ελληνική κουζίνα, Sunset Ammoudi για ψάρι." },
  { category: "faq", title: "Πετσέτες θαλάσσης", content: "Στο ντουλάπι του διαδρόμου." },
];

const PROPERTY = {
  checkin_time: "15:00",
  checkout_time: "11:00",
  wifi_name: "Villa_5G",
  wifi_password: "sea2026",
  house_rules: "Ησυχία μετά τις 23:00.",
  access_instructions: "Μπλε πόρτα, κωδικός 2468.",
  phone: "+30 694 000 0000",
  emergency_contact: "+30 697 111 1111",
};

// ---------- relevance retrieval ----------
test("wifi question retrieves the wifi item first", () => {
  const items = findRelevantItems("Ποιος είναι ο κωδικός WiFi;", KB);
  assert.ok(items.length > 0);
  assert.equal(items[0].category, "wifi");
});

test("beach question (English) retrieves the beaches item", () => {
  const items = findRelevantItems("Which beaches are close by?", KB);
  assert.ok(items.some((i) => i.category === "beaches"));
});

test("irrelevant question retrieves NOTHING → fallback without AI call", () => {
  const items = findRelevantItems("Τι καιρό θα κάνει αύριο στη Σαντορίνη;", KB);
  assert.equal(items.length, 0);
});

test("another unknown-info question also retrieves nothing", () => {
  const items = findRelevantItems("Do you have a helicopter pad?", KB);
  assert.equal(items.length, 0);
});

// ---------- property pseudo-items ----------
test("checkout question works even with EMPTY knowledge base (pseudo-items)", () => {
  const pseudo = propertyPseudoItems(PROPERTY);
  const items = findRelevantItems("Τι ώρα είναι το check-out;", pseudo);
  assert.ok(items.some((i) => i.category === "checkin_checkout"));
});

test("pseudo-items include wifi credentials", () => {
  const pseudo = propertyPseudoItems(PROPERTY);
  const wifi = pseudo.find((i) => i.category === "wifi");
  assert.ok(wifi);
  assert.ok(wifi!.content.includes("Villa_5G"));
});

// ---------- small talk ----------
test("greetings are small talk, not fallback", () => {
  assert.equal(detectSmallTalk("Γεια σας!"), "greeting");
  assert.equal(detectSmallTalk("hello"), "greeting");
  assert.equal(detectSmallTalk("Καλημέρα"), "greeting");
});

test("thanks are small talk", () => {
  assert.equal(detectSmallTalk("Ευχαριστώ πολύ!"), "thanks");
  assert.equal(detectSmallTalk("thank you"), "thanks");
});

test("real questions are NOT small talk", () => {
  assert.equal(detectSmallTalk("Γεια σας, ποιος είναι ο κωδικός WiFi;"), null);
});

// ---------- tokenization ----------
test("significantTokens drops stopwords and short words", () => {
  const tokens = significantTokens("Ποιες είναι οι κοντινές παραλίες;");
  assert.ok(tokens.includes("παραλιες"));
  assert.ok(!tokens.includes("ειναι"));
});
