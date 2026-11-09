import test from "node:test";
import assert from "node:assert/strict";
import { remainingSeconds, formatRemaining } from "../lib/companyTimer.mjs";

test("timer uses server time even when a device clock is five minutes ahead", () => {
  const start = "2026-11-09T12:00:00Z";
  const now = Date.parse(start) + 312000;
  assert.equal(remainingSeconds(start, now, -300000), 288);
  assert.equal(formatRemaining(288), "04:48");
});
test("reload and delayed polling do not restart the official five minute timer", () => {
  const start = "2026-11-09T12:00:00Z";
  assert.equal(
    formatRemaining(remainingSeconds(start, Date.parse(start) + 300000, 0)),
    "00:00",
  );
  assert.equal(
    formatRemaining(remainingSeconds(start, Date.parse(start) + 365000, 0)),
    "+01:05",
  );
  assert.equal(remainingSeconds(null, 0, 0), null);
  assert.equal(remainingSeconds("invalid", 0, 0), null);
  assert.equal(formatRemaining(null), "05:00");
});
