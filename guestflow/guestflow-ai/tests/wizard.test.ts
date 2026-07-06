import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseWizardResponse,
  normalizeCategory,
  computeSuggestions,
  suggestQuickButtons,
  type WizardItem,
} from "../src/lib/wizard/parse";

// ---------- category normalization ----------
test("valid categories pass through", () => {
  assert.equal(normalizeCategory("wifi"), "wifi");
  assert.equal(normalizeCategory("beaches"), "beaches");
});

test("AI aliases map to schema categories", () => {
  assert.equal(normalizeCategory("restaurants"), "food");
  assert.equal(normalizeCategory("taxi"), "transport");
  assert.equal(normalizeCategory("useful_tips"), "faq");
  assert.equal(normalizeCategory("local_recommendations"), "faq");
  assert.equal(normalizeCategory("check-in"), "checkin_checkout");
});

test("unknown categories fall back to faq", () => {
  assert.equal(normalizeCategory("spaceships"), "faq");
  assert.equal(normalizeCategory(""), "faq");
  assert.equal(normalizeCategory(undefined), "faq");
});

// ---------- parseWizardResponse ----------
const SAMPLE = JSON.stringify({
  property: {
    name: "Sunset Villa",
    area: "Oia, Santorini",
    checkin_time: "15:00",
    checkout_time: "11:00",
    wifi_name: "SunsetVilla",
    wifi_password: "12345678",
    phone: "+30 694 000 0000",
    emergency_contact: "",
    house_rules: "No smoking inside.",
    access_instructions: "",
  },
  welcome_message: "Welcome to Sunset Villa! Ask me anything.",
  items: [
    { category: "parking", title: "Parking", content: "Parking is free on the street." },
    { category: "beach", title: "Nearest beach", content: "400m away." },
    { category: "taxi", title: "Taxi", content: "+30 22860 71666" },
    { category: "nonsense", title: "Tip", content: "Sunsets are best from the terrace." },
    { category: "faq", title: "", content: "no title -> dropped" },
  ],
});

test("parses clean JSON and normalizes categories", () => {
  const r = parseWizardResponse(SAMPLE);
  assert.equal(r.property.name, "Sunset Villa");
  assert.equal(r.property.wifi_password, "12345678");
  assert.equal(r.welcome_message.startsWith("Welcome"), true);
  assert.equal(r.items.length, 4); // empty-title item dropped
  assert.equal(r.items.find((i) => i.title === "Nearest beach")?.category, "beaches");
  assert.equal(r.items.find((i) => i.title === "Taxi")?.category, "transport");
  assert.equal(r.items.find((i) => i.title === "Tip")?.category, "faq");
});

test("strips markdown fences", () => {
  const r = parseWizardResponse("```json\n" + SAMPLE + "\n```");
  assert.equal(r.property.name, "Sunset Villa");
});

test("salvages JSON wrapped in prose", () => {
  const r = parseWizardResponse("Here is the result:\n" + SAMPLE + "\nHope this helps!");
  assert.equal(r.property.name, "Sunset Villa");
});

test("invalid times fall back to defaults", () => {
  const r = parseWizardResponse(
    JSON.stringify({ property: { checkin_time: "3pm", checkout_time: "noon" }, items: [] })
  );
  assert.equal(r.property.checkin_time, "15:00");
  assert.equal(r.property.checkout_time, "11:00");
});

test("throws on completely invalid output", () => {
  assert.throws(() => parseWizardResponse("I could not process this."));
});

// ---------- suggestions ----------
test("suggests exactly the missing categories", () => {
  const items: WizardItem[] = [
    { category: "parking", title: "Parking", content: "x" },
    { category: "beaches", title: "Beach", content: "x" },
  ];
  const s = computeSuggestions(items);
  const cats = s.map((x) => x.category);
  assert.ok(cats.includes("transport")); // missing → suggested
  assert.ok(cats.includes("food"));
  assert.ok(!cats.includes("parking")); // present → not suggested
  assert.ok(!cats.includes("beaches"));
});

test("restaurant suggestion is a 'generate' action", () => {
  const s = computeSuggestions([]);
  assert.equal(s.find((x) => x.category === "food")?.action, "generate");
  assert.equal(s.find((x) => x.category === "transport")?.action, "add");
});

// ---------- quick buttons ----------
test("quick buttons follow available knowledge", () => {
  const items: WizardItem[] = [
    { category: "food", title: "Food", content: "x" },
    { category: "beaches", title: "Beaches", content: "x" },
  ];
  const qb = suggestQuickButtons(items);
  assert.ok(qb.includes("wifi")); // always
  assert.ok(qb.includes("checkout")); // always
  assert.ok(qb.includes("help")); // always
  assert.ok(qb.includes("restaurants")); // food present
  assert.ok(qb.includes("beaches"));
  assert.ok(!qb.includes("taxi")); // no transport info
});
