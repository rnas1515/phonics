// Reward rules, with no DOM or storage so they can be unit-tested.
// Every `per` lessons newly passed earns one game token; tokens bank up to `max`.

export const emptyRewards = () => ({ counted: {}, progress: 0, tokens: 0, earned: 0, lost: 0 });

/** Count a lesson once. Returns { counted, earnedToken } and mutates `r`. */
export function applyCount(r, lessonId, per = 5, max = 3, now = new Date().toISOString()) {
  if (r.counted[lessonId]) return { counted: false, earnedToken: false };
  r.counted[lessonId] = now;
  r.progress += 1;
  let earnedToken = false;
  if (r.progress >= per) {
    r.progress = 0;
    if (r.tokens < max) { r.tokens += 1; r.earned += 1; earnedToken = true; }
    else r.lost = (r.lost || 0) + 1; // shelf already full: the reward is not banked
  }
  return { counted: true, earnedToken };
}

/** Spend one token to start a game session. Returns true if one was available. */
export function applySpend(r) {
  if (r.tokens <= 0) return false;
  r.tokens -= 1;
  return true;
}
