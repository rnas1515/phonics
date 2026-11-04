# Lesson file format

Each lesson is one JSON file in `/lessons`. Drop a file in, push, and the site rebuilds (`npm test` checks it).
Or use **Tutor view → Lessons → Add lesson** (saved on that device; use *Export* to get the JSON file).

```jsonc
{
  "id": "sneaky-e",            // unique, no spaces
  "title": "Sneaky E",
  "saxonLesson": null,         // whole number, or null if unknown. Never guess.
  "skill": "sneaky-e",         // progress is tracked per skill
  "kind": "lesson",            // or "checkpoint" (one pass, no retries, scored in bands)
  "priority": 1,               // lower = suggested sooner
  "defaultActive": true,       // tutor can switch on/off per week
  "inReview": false,           // true = in the review mix before it is mastered
  "rule": "…", "trickText": "…", "say": "spoken intro",
  "example": { "word": "cake", "answer": "c a- k e/", "say": "spoken walk-through" },
  "bands": [{ "min": 13, "label": "Great", "say": "…" }],   // checkpoints only
  "activities": [ /* see below */ ]
}
```

## Teaching steps (all optional)
Every lesson plays: **intro → Watch (animated example) → Notice (if `discover`) → Together (2 guided items) → scored sets**.
Watch/Notice/Together are never scored. Together is skipped once the child has done 6+ items in the skill.

```jsonc
"discover": {
  "intro": "Sort these words…",
  "groups": [{ "id": "mid", "label": "In the middle", "why": "…" }, { "id": "end", "label": "At the end" }],
  "items":  [{ "word": "rain", "answer": "mid" }],            // answer = group id
  "question": "Which team do we usually see at the end?",
  "options": [{ "label": "ay", "correct": true }, { "label": "ai" }],   // exactly one correct
  "reveal": "Yes! …"
}
```

## Activities
Common fields: `type`, `items`, `instruction` (spoken + shown), `passRule` `{ "correct": 4, "of": 6 }`
(default: 2/3 of up to 6), `optional` (doesn't block mastery), `section` (checkpoint heading).

Mastery rule: a set of `of` items is drawn; `correct` right on the first try passes. Otherwise the trick is shown
again, 2 guided words are done, and a fresh set is tried (up to 3 sets).

| type | item fields | notes |
|---|---|---|
| `code` | `word`, `answer?`, `why?` | Tap-to-mark. `answer` optional: auto-coded (sneaky e, short vowel, teams). Optional `tools` (default `breve, macron, strike, underline`; also `box`, `divide`) — **only these marks are graded**. `box`/`divide` items need an explicit `answer` (`"j u m p e# d#"`, `"n a p | k i n"`). `"alsoAccept": "ee-full"` also accepts macron + slash + underline on ee. |
| `sort` | `word`, `answer` (category id), `why?` | Needs `categories: [{id,label,why?}]`. |
| `fill` + `"oneLetter": true` | `word` | The one-letter game. Words ending ck/k are derived automatically. For other endings give `stem`, `answer`, `beforeKind`, `why` (+ optional `step2`, `step2Why`) and set `choices`, `kinds`, `ruleStrip` on the activity (see `lessons/ke-c-endings.json`). |
| `fill` | `word`, `pattern` (`sl__p`), `answer` | Needs `choices: ["ee","ea"]`. |
| `sightword` | `word` | `"marking": "tutor"` = tutor taps Easily / Needed help (PIN required). |
| `comprehension` | `passage`, `question`, `choices[]`, `answer` (index) | Read aloud automatically. |

### Coding notation (`answer` for `code`)
One token per letter; marks after the letter: `v` breve · `-` macron · `/` strike · `_` underline.

    cake  → "c a- k e/"     black → "b l av c_ k_"     seed → "s e_ e_ d"

## Content policy
Use original practice words and sentences. Do not copy Saxon worksheets or word lists.
