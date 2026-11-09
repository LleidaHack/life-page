/** Remaining seconds on the server clock, independent of polling frequency. */
export function remainingSeconds(
  startedAt,
  localNow,
  serverOffset,
  duration = 300,
) {
  if (!startedAt) return null;
  const start = Date.parse(startedAt);
  if (!Number.isFinite(start)) return null;
  return Math.ceil((start + duration * 1000 - localNow - serverOffset) / 1000);
}

export function formatRemaining(seconds) {
  if (seconds === null) return "05:00";
  return `${seconds < 0 ? "+" : ""}${String(Math.floor(Math.abs(seconds) / 60)).padStart(2, "0")}:${String(Math.abs(seconds) % 60).padStart(2, "0")}`;
}
