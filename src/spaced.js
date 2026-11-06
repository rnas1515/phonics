// Spaced review: a skill that has been practiced comes back after 3, then 7, then 14 days (pure, no DOM).
export const LADDER = [3, 7, 14];
const DAY = 864e5;
const dayOf = (iso) => new Date(iso).getTime();

/** When is this skill next due? ms timestamp, or null if it is not in the review cycle. */
export function dueAt(k) {
  if (!k || !k.masteredAt || k.placed) return null; // only skills he really practiced
  if (k.review?.due) return dayOf(k.review.due);
  return dayOf(k.masteredAt) + LADDER[0] * DAY;
}

export function isDue(k, now = Date.now()) {
  const d = dueAt(k);
  return d !== null && d <= now;
}

/** Skill ids that are due, most overdue first. */
export function dueSkills(skills, now = Date.now()) {
  return Object.entries(skills)
    .filter(([, k]) => isDue(k, now))
    .sort((a, b) => dueAt(a[1]) - dueAt(b[1]))
    .map(([id]) => id);
}

/** After a review round on one skill: 4 of 6 right (about two thirds) moves it up the ladder, otherwise it starts again. */
export function nextReview(k, correct, total, now = Date.now()) {
  const passed = total > 0 && correct / total >= 0.66;
  const step = passed ? Math.min((k.review?.step ?? 0) + 1, LADDER.length - 1) : 0;
  const gap = LADDER[passed ? step : 0];
  return { step, due: new Date(now + gap * DAY).toISOString(), last: new Date(now).toISOString() };
}
