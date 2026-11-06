# Reward games

- **Earning:** a lesson counts once, the first time all its required activities are passed (not the check-up, review mix,
  sight words or optional activities). Every 5 counted lessons earns 1 game token. Up to 3 tokens are kept; a reward earned
  while the shelf is full is not banked.
- **Playing:** spending a token opens a 5-minute game session (a calm clock; the round in progress can finish).
  The session survives a reload (kept in sessionStorage), but not a closed tab.
- **Games** (`src/games/`): Memory Match (word <-> coded twin), Sorting Rush (sort words from his lessons), Mystery Word
  (find the spoken word). Words come from lessons he has practiced.
- **Separate from learning:** games never change skill accuracy, mastery, trouble words or lesson points. They only keep
  `progress.games` (sessions, plays, best scores) and the "Game Time" badge.
- **Settings** (in `src/store.js`, no tutor UI yet): `lessonsPerGame` (5), `maxTokens` (3), `gameMinutes` (5).
- **Logic:** `src/rewardlogic.js` (pure, unit-tested in `npm test`), `src/rewards.js` (storage).
