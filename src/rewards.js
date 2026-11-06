import { getProgress, getSettings, saveProgress } from './store.js';
import { applyCount, applySpend } from './rewardlogic.js';

export function rewardStatus() {
  const P = getProgress(), S = getSettings();
  return { progress: P.rewards.progress, per: S.lessonsPerGame, tokens: P.rewards.tokens, max: S.maxTokens };
}

/** A lesson was passed for the first time: count it toward the next game. */
export function countLesson(lessonId) {
  const S = getSettings();
  const res = applyCount(getProgress().rewards, lessonId, S.lessonsPerGame, S.maxTokens);
  if (res.counted) saveProgress();
  return { ...res, ...rewardStatus() };
}

/** Start a game session: spends a token. */
export function spendToken() {
  const P = getProgress();
  if (!applySpend(P.rewards)) return false;
  P.games.sessions += 1;
  saveProgress();
  return true;
}

export function recordGame(gameId, score) {
  const P = getProgress();
  P.games.plays[gameId] = (P.games.plays[gameId] || 0) + 1;
  if (score > (P.games.best[gameId] || 0)) P.games.best[gameId] = score;
  saveProgress();
}
