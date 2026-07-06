import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampConfidence,
  computeMergePlan,
  parseWizardResponse,
  type WizardExtraction,
} from "../src/lib/wizard/parse";
import { computeInsights, computeKnowledgeHealth } from "../src/lib/health";

// ---------- confidence ----------
test("clampConfidence clamps and rounds", () => {
  assert.equal(clampConfidence(98), 98);
  assert.equal(clampConfidence(150), 100);
  assert.equal(clampConfidence(-5), 0);
  assert.equal(clampConfidence(61.7), 62);
  assert.equal(clampConfidence("85"), 85);
  assert.equal(clampConfidence("high"), null);
  assert.equal(clampConfidence(undefined), null);
});

test("parse keeps item confidence and property_confidence", () => {
  const r = parseWizardResponse(
    JSON.stringify({
      property: { wifi_name: "Villa_5G", wifi_password: "x" },
      property_confidence: { wifi_name: 98, wifi_password: 120, house_rules: "n/a" },
      items: [
        { category: "parking", title: "Parking", content: "Free.", confidence: 62 },
        { category: "beaches", title: "Beach", content: "400m.", confidence: 95 },
      ],
    })
  );
  assert.equal(r.items[0].confidence, 62);
  assert.equal(r.items[1].confidence, 95);
  assert.equal(r.property_confidence.wifi_name, 98);
  assert.equal(r.property_confidence.wifi_password, 100); // clamped
  assert.equal(r.property_confidence.house_rules, undefined); // invalid dropped
});

// ---------- Smart Merge ----------
function makeExtraction(over: Partial<WizardExtraction["property"]>, items: WizardExtraction["items"] = []): WizardExtraction {
  return {
    property: {
      name: "", area: "", checkin_time: "", checkout_time: "",
      wifi_name: "", wifi_password: "", phone: "", emergency_contact: "",
      house_rules: "", access_instructions: "", ...over,
    },
    welcome_message: "",
    items,
    property_confidence: {},
  };
}

const EXISTING_PROP = {
  name: "Sunset Villa", area: "Oia", checkin_time: "15:00", checkout_time: "11:00",
  wifi_name: "OldWifi", wifi_password: "oldpass", phone: "+30 111",
  emergency_contact: "", house_rules: "No smoking.", access_instructions: "",
};

test("merge plan: different values become field conflicts", () => {
  const plan = computeMergePlan(
    EXISTING_PROP,
    [],
    makeExtraction({ wifi_name: "NewWifi", checkin_time: "15:00" })
  );
  const fields = plan.fieldConflicts.map((c) => c.field);
  assert.ok(fields.includes("wifi_name")); // differs → conflict
  assert.ok(!fields.includes("checkin_time")); // identical → no conflict
});

test("merge plan: empty existing fields are auto-fill, not conflicts", () => {
  const plan = computeMergePlan(
    EXISTING_PROP,
    [],
    makeExtraction({ emergency_contact: "+30 697", access_instructions: "Blue door." })
  );
  assert.ok(plan.newFields.includes("emergency_contact"));
  assert.ok(plan.newFields.includes("access_instructions"));
  assert.equal(plan.fieldConflicts.length, 0);
});

test("merge plan: category present on both sides is a conflict, new is not", () => {
  const plan = computeMergePlan(
    EXISTING_PROP,
    [{ category: "parking" }, { category: "parking" }],
    makeExtraction({}, [
      { category: "parking", title: "P", content: "x" },
      { category: "beaches", title: "B", content: "y" },
    ])
  );
  assert.equal(plan.categoryConflicts.length, 1);
  assert.equal(plan.categoryConflicts[0].category, "parking");
  assert.equal(plan.categoryConflicts[0].existingCount, 2);
  assert.deepEqual(plan.newCategories, ["beaches"]);
});

test("merge plan: import with nothing produces no decisions", () => {
  const plan = computeMergePlan(EXISTING_PROP, [{ category: "faq" }], makeExtraction({}));
  assert.equal(plan.fieldConflicts.length, 0);
  assert.equal(plan.newFields.length, 0);
  assert.equal(plan.categoryConflicts.length, 0);
});

// ---------- Knowledge Health ----------
const FULL_PROPERTY = {
  wifi_name: "V", wifi_password: "p", house_rules: "r", access_instructions: "a",
  phone: "1", emergency_contact: "2", welcome_message: "w",
};

test("health is 100% when everything is filled", () => {
  const h = computeKnowledgeHealth(
    FULL_PROPERTY,
    new Set(["transport", "parking", "beaches", "food", "supermarket", "pharmacy"])
  );
  assert.equal(h.percent, 100);
  assert.equal(h.missing.length, 0);
});

test("health reports missing sections", () => {
  const h = computeKnowledgeHealth(
    { ...FULL_PROPERTY, emergency_contact: "" },
    new Set(["parking", "beaches", "food", "supermarket"])
  );
  assert.ok(h.percent < 100);
  const keys = h.missing.map((m) => m.key);
  assert.ok(keys.includes("emergency"));
  assert.ok(keys.includes("transport"));
  assert.ok(keys.includes("pharmacy"));
  assert.ok(!keys.includes("wifi"));
});

test("health: wifi needs BOTH name and password", () => {
  const h = computeKnowledgeHealth({ ...FULL_PROPERTY, wifi_password: "" }, new Set());
  assert.ok(h.missing.some((m) => m.key === "wifi"));
});

// ---------- Insights ----------
test("frequent topic without knowledge → add-info insight", () => {
  const ins = computeInsights({ transport: 5 }, new Set(), new Set());
  assert.ok(ins.some((i) => i.id === "add-transport"));
});

test("knowledge present but quick button off → button insight", () => {
  const ins = computeInsights({ transport: 5 }, new Set(["transport"]), new Set(["wifi"]));
  assert.ok(ins.some((i) => i.id === "button-taxi"));
});

test("rare topics (below threshold) produce no insight", () => {
  const ins = computeInsights({ transport: 2 }, new Set(), new Set());
  assert.ok(!ins.some((i) => i.id === "add-transport"));
});

test("activity without FAQ → FAQ nudge; capped at max", () => {
  const ins = computeInsights(
    { transport: 5, parking: 4, food: 4, beaches: 3, pharmacy: 3 },
    new Set(),
    new Set(),
    4
  );
  assert.ok(ins.length <= 4);
});
