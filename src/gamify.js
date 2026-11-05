import { getProgress, saveProgress } from './store.js';

// A badge for mastering a skill needs real practice; a skill marked secure by the check-up does not count.
const earned = (P, skill) => !!P.skills[skill]?.masteredAt && !P.skills[skill].placed;

export const BADGES = [
  { id: 'first-case', emoji: '🔍', name: 'First Case', how: 'Finish your first practice', test: (P) => P.sessions.some((s) => s.items > 0) },
  { id: 'sneaky-e', emoji: '🕶️', name: 'Sneaky E Sleuth', how: 'Master Sneaky E', test: (P) => earned(P, 'sneaky-e') },
  { id: 'ck-k', emoji: '🗝️', name: 'ck / k Case Cracker', how: 'Master ck and k', test: (P) => earned(P, 'ck-k') },
  { id: 'teams', emoji: '👥', name: 'Team Spotter', how: 'Master the ee and oo teams', test: (P) => earned(P, 'ee-team') && earned(P, 'oo-team') },
  { id: 'sight', emoji: '👁️', name: 'Sight Word Ace', how: 'Master the sight words', test: (P) => earned(P, 'sight-a8') },
  { id: 'perfect', emoji: '💎', name: 'Perfect Set', how: 'Get every word right in a set', test: (P) => !!P.badges.perfect },
  { id: 'streak3', emoji: '🔥', name: '3-Day Streak', how: 'Practice 3 days in a row', test: (P) => P.streak.best >= 3 },
  { id: 'streak7', emoji: '🚀', name: '7-Day Streak', how: 'Practice 7 days in a row', test: (P) => P.streak.best >= 7 },
  { id: 'review', emoji: '🔁', name: 'Review Ranger', how: 'Finish 3 review mixes', test: (P) => P.reviews >= 3 },
  { id: 'points100', emoji: '⭐', name: '100 Points', how: 'Earn 100 points', test: (P) => P.points >= 100 },
  { id: 'points500', emoji: '🌟', name: '500 Points', how: 'Earn 500 points', test: (P) => P.points >= 500 },
];

/** Award event badges (like "perfect") directly. */
export function award(id) {
  const P = getProgress();
  if (!P.badges[id]) { P.badges[id] = new Date().toISOString(); saveProgress(); }
}

/** Check all badge rules; returns the badge definitions that are newly earned. */
export function checkBadges() {
  const P = getProgress();
  const fresh = [];
  for (const b of BADGES) {
    if (!P.badges[b.id] && b.test(P)) {
      P.badges[b.id] = new Date().toISOString();
      fresh.push(b);
    }
  }
  if (fresh.length) saveProgress();
  return fresh;
}
