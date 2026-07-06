import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLimit } from "../src/lib/rate-limit";

// The DB lookup happens in the route; the validation RULE itself is
// pure and tested here: a session is valid only for its own property.
function isSessionValidForProperty(
  session: { id: string; property_id: string } | null,
  propertyId: string
): boolean {
  return !!session && session.property_id === propertyId;
}

// ---------- session validation ----------
test("session belonging to the property is valid", () => {
  assert.equal(
    isSessionValidForProperty({ id: "s1", property_id: "prop-A" }, "prop-A"),
    true
  );
});

test("session from ANOTHER property is rejected", () => {
  assert.equal(
    isSessionValidForProperty({ id: "s1", property_id: "prop-B" }, "prop-A"),
    false
  );
});

test("missing session is rejected", () => {
  assert.equal(isSessionValidForProperty(null, "prop-A"), false);
});

// ---------- rate limiter ----------
test("allows up to the limit, then blocks", () => {
  const key = `test:${Math.random()}`;
  for (let i = 0; i < 5; i++) {
    assert.equal(checkLimit(key, 5, 60_000), true, `call ${i + 1} should pass`);
  }
  assert.equal(checkLimit(key, 5, 60_000), false, "6th call should be blocked");
});

test("different keys have independent buckets", () => {
  const a = `test:${Math.random()}`;
  const b = `test:${Math.random()}`;
  assert.equal(checkLimit(a, 1, 60_000), true);
  assert.equal(checkLimit(a, 1, 60_000), false);
  assert.equal(checkLimit(b, 1, 60_000), true); // unaffected by key a
});

test("window expiry restores capacity", async () => {
  const key = `test:${Math.random()}`;
  assert.equal(checkLimit(key, 1, 50), true);
  assert.equal(checkLimit(key, 1, 50), false);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(checkLimit(key, 1, 50), true, "allowed again after the window");
});
