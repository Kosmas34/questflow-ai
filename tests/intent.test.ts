import { test } from "node:test";
import assert from "node:assert/strict";
import { detectRequest, detectTopic, normalize } from "../src/lib/ai/intent";

// ---------- normalize ----------
test("normalize strips Greek accents and lowercases", () => {
  assert.equal(normalize("Πετσέτες"), "πετσετες");
  assert.equal(normalize("ΤΑΞΊ"), "ταξι");
  assert.equal(normalize("Late CHECKOUT"), "late checkout");
});

// ---------- detectRequest ----------
test("towel requests create housekeeping request (Greek, accented)", () => {
  assert.equal(detectRequest("Θέλω καθαρές πετσέτες παρακαλώ")?.category, "housekeeping");
});

test("towel requests create housekeeping request (English)", () => {
  assert.equal(detectRequest("We need more towels please")?.category, "housekeeping");
});

test("problem reports create issue request", () => {
  assert.equal(detectRequest("Το κλιματιστικό δεν λειτουργεί")?.category, "issue");
  assert.equal(detectRequest("The shower is broken")?.category, "issue");
  assert.equal(detectRequest("Υπάρχει διαρροή στο μπάνιο")?.category, "issue");
});

test("taxi requests need intent, not just the word", () => {
  assert.equal(detectRequest("Θέλω ταξί για το αεροδρόμιο")?.category, "taxi");
  assert.equal(detectRequest("Can you book a taxi for 9am?")?.category, "taxi");
  // Informational question about taxis is NOT a request:
  assert.equal(detectRequest("Πόσο κοστίζει το ταξί από το λιμάνι;"), null);
});

test("late checkout requests are detected", () => {
  assert.equal(detectRequest("Can we have a late checkout?")?.category, "late_checkout");
  assert.equal(detectRequest("Γίνεται checkout πιο αργά;")?.category, "late_checkout");
});

test("explicit help requests are detected", () => {
  assert.equal(detectRequest("I need help")?.category, "help");
  assert.equal(detectRequest("Χρειάζομαι βοήθεια")?.category, "help");
});

test("plain informational questions do NOT create requests", () => {
  assert.equal(detectRequest("Ποιος είναι ο κωδικός WiFi;"), null);
  assert.equal(detectRequest("Which beaches are nearby?"), null);
  assert.equal(detectRequest("Τι ώρα είναι το check-in;"), null);
});

// ---------- detectTopic ----------
test("topics are classified for analytics", () => {
  assert.equal(detectTopic("Ποιος είναι ο κωδικός WiFi;"), "wifi");
  assert.equal(detectTopic("What time is check-out?"), "checkin_checkout");
  assert.equal(detectTopic("Πού μπορώ να παρκάρω;"), "parking");
  assert.equal(detectTopic("Which beaches do you recommend?"), "beaches");
  assert.equal(detectTopic("Πού να φάμε καλό ψάρι;"), "food");
  assert.equal(detectTopic("Is there a supermarket nearby?"), "supermarket");
  assert.equal(detectTopic("Υπάρχει φαρμακείο κοντά;"), "pharmacy");
  assert.equal(detectTopic("Επιτρέπεται το κάπνισμα;"), "rules");
  assert.equal(detectTopic("Πώς πάω στο λιμάνι με λεωφορείο;"), "transport");
  assert.equal(detectTopic("Τι καιρό θα κάνει αύριο;"), "other");
});
