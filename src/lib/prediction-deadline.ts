// Predictions for a week lock at 6pm America/New_York on Wednesday. Every
// prediction page reflects "whatever week isn't fully played yet" (see
// getPredictionMatchups), so a single check against the current real-world
// time — with no notion of which NFL week is showing — is enough: that
// week's own Wednesday is always the *current* calendar week's Wednesday,
// since the page only starts showing a week once it's up for voting.
export function isPredictionDeadlinePassed(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  let hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  if (hour === 24) hour = 0;

  const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayIndex = order.indexOf(weekday);
  const wednesday = 3;

  if (dayIndex === -1) return false;
  if (dayIndex < wednesday) return false;
  if (dayIndex === wednesday) return hour >= 18;
  return true; // Thu/Fri/Sat
}
