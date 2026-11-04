// Saxon-style coding marks. Pure module (no DOM) so Node scripts can import it.
//
// Compact notation: one token per letter, separated by spaces. A letter may be
// followed by mark characters:  v = breve,  - = macron,  / = strike-through,  _ = underline
//   cake  -> "c a- k e/"      black -> "b l av c_ k_"      seed -> "s e_ e_ d"
// Extra: # = box (suffix), a lone | token = syllable boundary:  "n a p | k i n",  "j u m p e# d#".
// A letter can carry several marks: "e-_" = macron + underline.

const CODE = { v: 'breve', '-': 'macron', '/': 'strike', _: 'underline', '#': 'box' };
export const MARK_CODE = { breve: 'v', macron: '-', strike: '/', underline: '_', box: '#' };
export const MARKS = ['breve', 'macron', 'strike', 'underline'];
/** Every tool an activity may offer. 'divide' = syllable boundary between two letters. */
export const ALL_TOOLS = ['breve', 'macron', 'strike', 'underline', 'box', 'divide'];

const VOWELS = 'aeiou';
// Letter teams that are coded with an underline under both letters.
const DIGRAPHS = ['ee', 'oo', 'ai', 'ay', 'oa', 'ea', 'ck', 'sh', 'th', 'ch', 'wh'];

/** Parse into { letters:[{ch,marks}], boundaries:Set<position between letters> }. */
export function parseCodedFull(str) {
  const toks = String(str).trim().split(/\s+/).filter(Boolean);
  if (!toks.length) throw new Error('Empty coded word');
  const letters = [];
  const boundaries = new Set();
  for (const t of toks) {
    if (t === '|') {
      if (!letters.length) throw new Error('A "|" cannot come first');
      boundaries.add(letters.length);
      continue;
    }
    if (!/^[a-zA-Z]/.test(t)) throw new Error(`Bad token "${t}" (each token starts with a letter)`);
    const marks = [...t.slice(1)].map((c) => {
      if (!CODE[c]) throw new Error(`Unknown mark "${c}" in "${t}" (use v - / _ #)`);
      return CODE[c];
    });
    letters.push({ ch: t[0].toLowerCase(), marks: [...new Set(marks)] });
  }
  if ([...boundaries].some((p) => p >= letters.length)) throw new Error('A "|" cannot come last');
  return { letters, boundaries };
}

/** Letters only (kept for callers that do not care about syllable boundaries). */
export const parseCoded = (str) => parseCodedFull(str).letters;

export function serialize(parsed, boundaries = new Set()) {
  return parsed
    .map((p, i) => p.ch + p.marks.map((m) => MARK_CODE[m]).join('') + (boundaries.has(i + 1) ? ' |' : ''))
    .join(' ');
}

/** Best-guess coding for a word. A convenience for lesson authors: always check the preview. */
export function autoCode(word) {
  const w = word.toLowerCase();
  const m = [...w].map(() => []);
  for (let i = 0; i < w.length; ) {
    if (m[i].length) { i++; continue; }
    const pair = w.slice(i, i + 2);
    if (DIGRAPHS.includes(pair)) {
      m[i] = ['underline'];
      m[i + 1] = ['underline'];
      i += 2;
      continue;
    }
    const c = w[i];
    if (VOWELS.includes(c)) {
      const next = w[i + 1];
      const next2 = w[i + 2];
      if (next && !VOWELS.includes(next) && next2 === 'e' && i + 2 === w.length - 1 && c !== 'e') {
        m[i] = ['macron']; // sneaky e: vowel, consonant, final e
        m[i + 2] = ['strike'];
      } else if (i === w.length - 1 && w.length === 2) {
        m[i] = ['macron']; // open vowel (he, go, no)
      } else if (next && !VOWELS.includes(next) && !(c === 'u' && w[i - 1] === 'q')) {
        m[i] = ['breve']; // short vowel closed by a consonant
      }
    }
    i++;
  }
  return serialize([...w].map((ch, i) => ({ ch, marks: m[i] })));
}

/** Plain-English reason for a coding, spoken when the child misses it. `tools` limits it to what was asked. */
export function describeCoding(parsed, word, tools = MARKS, boundaries = new Set()) {
  const has = (mk) => tools.includes(mk) && parsed.some((p) => p.marks.includes(mk));
  const parts = [];
  if (has('box')) {
    const first = parsed.findIndex((p) => p.marks.includes('box'));
    parts.push(`A suffix is an ending added to a base word. Here the base word is ${word.slice(0, first)} and the suffix is ${word.slice(first)}. Put a box around the whole suffix.`);
  }
  if (tools.includes('divide') && boundaries.size) {
    const p = [...boundaries][0];
    parts.push(`Two consonants sit between the vowels. Divide between them: ${word.slice(0, p)} | ${word.slice(p)}.`);
  }
  if (has('strike') && has('macron') && !has('underline')) {
    const vi = parsed.findIndex((p) => p.marks.includes('macron'));
    parts.push(
      `${word} has a sneaky e at the end. The e is silent and makes the ${parsed[vi].ch} say its name. ` +
        'Put a macron on that vowel and cross out the e.'
    );
  } else if (has('macron') && !has('underline')) {
    parts.push('A vowel at the end of a short word says its name, so it gets a macron.');
  }
  if (has('breve')) {
    const vi = parsed.findIndex((p) => p.marks.includes('breve'));
    parts.push(`The ${parsed[vi].ch} is a vowel with a consonant after it and no sneaky e, so it is short. Put a breve on it.`);
  }
  if (has('underline')) {
    const teams = [];
    for (let i = 0; i < parsed.length - 1; i++) {
      if (parsed[i].marks.includes('underline') && parsed[i + 1].marks.includes('underline')) {
        teams.push(parsed[i].ch + parsed[i + 1].ch);
        i++;
      }
    }
    parts.push(`${teams.join(' and ')} ${teams.length > 1 ? 'are teams' : 'is a team'}: two letters, one sound. Underline both letters.`);
  }
  return parts.join(' ') || `Code ${word} the way the rule says.`;
}

/**
 * Deterministic grading. state: per-letter iterables of marks; bounds: Set of boundary positions.
 * Only the marks in `tools` are graded (target-only), so a "box the suffix" task never penalises missing vowel marks.
 */
export function gradeCoding(state, bounds, expected, expectedBounds, tools = MARKS) {
  const markTools = tools.filter((t) => t !== 'divide');
  const key = (marks) => [...marks].filter((m) => markTools.includes(m)).sort().join(',');
  const badLetters = [];
  expected.forEach((e, i) => { if (key(e.marks) !== key(state[i] || [])) badLetters.push(i); });
  const badBounds = [];
  if (tools.includes('divide')) {
    for (const p of new Set([...bounds, ...expectedBounds])) if (bounds.has(p) !== expectedBounds.has(p)) badBounds.push(p);
  }
  return { ok: !badLetters.length && !badBounds.length, badLetters, badBounds };
}
