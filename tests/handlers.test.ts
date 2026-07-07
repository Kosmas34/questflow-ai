import { test } from "node:test";
import assert from "node:assert/strict";
import { detectCoreIntent, handleCoreIntent, type HandlerProperty } from "../src/lib/ai/handlers";

const PROPERTY: HandlerProperty = {
  name: "Mitsis",
  checkin_time: "15:00",
  checkout_time: "11:00",
  wifi_name: "Mitsis",
  wifi_password: "Mitsis2026",
  house_rules: "Όχι κάπνισμα μέσα. Ησυχία μετά τις 23:00.",
  access_instructions: "Μπλε πόρτα, κωδικός 2468.",
  phone: "+30 210 000 0000",
  emergency_contact: "+30 697 111 1111",
};

// ---------- intent detection ----------
test("wifi intent (EN + EL, various phrasings)", () => {
  assert.equal(detectCoreIntent("What is the WiFi password?"), "wifi");
  assert.equal(detectCoreIntent("Ποιος είναι ο κωδικός για το ίντερνετ;"), "wifi");
  assert.equal(detectCoreIntent("wifi?"), "wifi");
  assert.equal(detectCoreIntent("Πώς συνδέομαι στο δίκτυο;"), "wifi");
});

test("checkout is not swallowed by check-in", () => {
  assert.equal(detectCoreIntent("What time is checkout?"), "checkout");
  assert.equal(detectCoreIntent("Τι ώρα είναι το check-out;"), "checkout");
  assert.equal(detectCoreIntent("Τι ώρα αναχώρηση;"), "checkout");
});

test("check-in intent", () => {
  assert.equal(detectCoreIntent("What time is check-in?"), "checkin");
  assert.equal(detectCoreIntent("Τι ώρα είναι η άφιξη;"), "checkin");
});

test("emergency beats generic phone", () => {
  assert.equal(detectCoreIntent("What's the emergency number?"), "emergency");
  assert.equal(detectCoreIntent("Τηλέφωνο για έκτακτη ανάγκη;"), "emergency");
});

test("phone / contact intent", () => {
  assert.equal(detectCoreIntent("How can I contact the host?"), "phone");
  assert.equal(detectCoreIntent("Ποιο είναι το τηλέφωνο επικοινωνίας;"), "phone");
});

test("rules and access intents", () => {
  assert.equal(detectCoreIntent("Is smoking allowed?"), "rules");
  assert.equal(detectCoreIntent("Επιτρέπονται κατοικίδια;"), "rules");
  assert.equal(detectCoreIntent("How do I get in?"), "access");
  assert.equal(detectCoreIntent("Πού είναι το κλειδί;"), "access");
});

test("unrelated question → no core intent (goes to AI)", () => {
  assert.equal(detectCoreIntent("Which beaches do you recommend?"), null);
  assert.equal(detectCoreIntent("Πού να φάμε καλό ψάρι;"), null);
});

// ---------- direct answers ----------
test("wifi answer, both languages, exact format", () => {
  assert.equal(
    handleCoreIntent("wifi", PROPERTY, "en"),
    "WiFi network: Mitsis. Password: Mitsis2026."
  );
  assert.equal(
    handleCoreIntent("wifi", PROPERTY, "el"),
    "Το WiFi είναι: Mitsis. Ο κωδικός είναι: Mitsis2026."
  );
});

test("checkout / checkin answers", () => {
  assert.equal(handleCoreIntent("checkout", PROPERTY, "en"), "Check-out is until 11:00.");
  assert.equal(handleCoreIntent("checkin", PROPERTY, "el"), "Το check-in είναι από τις 15:00.");
});

test("emergency falls back to main phone when no dedicated contact", () => {
  const noEmergency = { ...PROPERTY, emergency_contact: "" };
  assert.equal(
    handleCoreIntent("emergency", noEmergency, "en"),
    "For emergencies, please call: +30 210 000 0000."
  );
});

test("rules and access answers include the content", () => {
  assert.ok(handleCoreIntent("rules", PROPERTY, "el")!.includes("κάπνισμα"));
  assert.ok(handleCoreIntent("access", PROPERTY, "en")!.includes("2468"));
});

test("handler returns null when data is missing → pipeline goes to AI", () => {
  const empty: HandlerProperty = {
    name: "X", checkin_time: "", checkout_time: "", wifi_name: "", wifi_password: "",
    house_rules: "", access_instructions: "", phone: "", emergency_contact: "",
  };
  assert.equal(handleCoreIntent("wifi", empty, "en"), null);
  assert.equal(handleCoreIntent("checkout", empty, "en"), null);
  assert.equal(handleCoreIntent("phone", empty, "en"), null);
  assert.equal(handleCoreIntent("emergency", empty, "en"), null);
  assert.equal(handleCoreIntent("rules", empty, "el"), null);
});

test("wifi with only a network name (no password)", () => {
  const p = { ...PROPERTY, wifi_password: "" };
  assert.equal(handleCoreIntent("wifi", p, "en"), "The WiFi network is: Mitsis.");
});

// ---------- affirmative follow-up detection ----------
import { isAffirmative, looksLikeTeamOffer } from "../src/lib/ai/handlers";

test("isAffirmative catches short confirmations (EL + EN)", () => {
  assert.equal(isAffirmative("κάντο"), true);
  assert.equal(isAffirmative("Ναι"), true);
  assert.equal(isAffirmative("ναι παρακαλώ"), true);
  assert.equal(isAffirmative("yes please"), true);
  assert.equal(isAffirmative("ok"), true);
  assert.equal(isAffirmative("προχώρα"), true);
});

test("isAffirmative rejects real questions", () => {
  assert.equal(isAffirmative("Ποια εστιατόρια προτείνετε εδώ κοντά;"), false);
  assert.equal(isAffirmative("What time is checkout?"), false);
  assert.equal(isAffirmative("ναι αλλά θέλω και κάτι άλλο επίσης τώρα"), false);
});

test("looksLikeTeamOffer recognizes the assistant's offer", () => {
  assert.equal(
    looksLikeTeamOffer("Δεν το έχω καταχωρημένο. Μπορώ όμως να ενημερώσω την ομάδα του καταλύματος για να σας βοηθήσει."),
    true
  );
  assert.equal(
    looksLikeTeamOffer("I can notify the property team so they can help you."),
    true
  );
  assert.equal(looksLikeTeamOffer("Το check-out είναι έως τις 11:00."), false);
});
