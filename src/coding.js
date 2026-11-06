// Saxon-style coding marks. Pure module (no DOM) so Node scripts can import it.
//
// Compact notation: one token per letter, separated by spaces. A letter may be
// followed by mark characters:  v = breve,  - = macron,  / = strike-through,  _ = underline
//   cake  -> "c a- k e/"      black -> "b l av c_ k_"      seed -> "s e_ e_ d"
// More marks (from the school's Coding Reminders): ~ arc (combinations, diphthongs), ` k-back (hard c), , cedilla (soft c),
// @ schwa, = voice line, [ bracket in front of a final stable syllable.   "b[" = bracket before the b.
// Extra: # = box (suffix/prefix), a lone | token = syllable boundary:  "n a p | k i n",  "j u m p e# d#".
// A letter can carry several marks: "e-_" = macron + underline.

const CODE = {
  v: 'breve', '-': 'macron', '/': 'strike', _: 'underline', '#': 'box',
  '~': 'arc', '`': 'kback', ',': 'cedilla', '@': 'schwa', '=': 'voice', '[': 'bracket',
};
export const MARK_CODE = Object.fromEntries(Object.entries(CODE).map(([c, m]) => [m, c]));
export const MARKS = ['breve', 'macron', 'strike', 'underline'];
/** Every tool an activity may offer. 'divide' = syllable boundary between two letters. */
export const ALL_TOOLS = ['breve', 'macron', 'strike', 'underline', 'box', 'divide', 'arc', 'kback', 'cedilla', 'schwa', 'voice', 'bracket'];

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

/** Marks that cannot sit on the same letter: choosing one replaces the other. */
export const CONFLICTS = { breve: ['macron'], macron: ['breve'], kback: ['cedilla'], cedilla: ['kback'] };

/** Runs of adjacent letters that share a mark, e.g. ['ee'] for underline in "seed". */
function groupsOf(parsed, mark) {
  const out = [];
  for (let i = 0; i < parsed.length; i++) {
    if (!parsed[i].marks.includes(mark)) continue;
    let j = i;
    while (j + 1 < parsed.length && parsed[j + 1].marks.includes(mark)) j++;
    out.push(parsed.slice(i, j + 1).map((p) => p.ch).join(''));
    i = j;
  }
  return out;
}

/** Observed school notation for vowel teams (only use it on activities whose words really say the long sound): macron on the first vowel, slash through the second, underline both. */
const TEAM_PAIRS = new Set(['ee', 'ai', 'ay', 'oa', 'ea', 'ow', 'ue', 'ie', 'ey']);
export function teamFullAlt(coded) {
  const { letters, boundaries } = parseCodedFull(coded);
  let changed = false;
  for (let i = 0; i < letters.length - 1; i++) {
    const a = letters[i], b = letters[i + 1];
    if (TEAM_PAIRS.has(a.ch + b.ch) && a.marks.join() === 'underline' && b.marks.join() === 'underline') {
      a.marks = ['macron', 'underline'];
      b.marks = ['strike', 'underline'];
      changed = true;
      i++;
    }
  }
  return changed ? serialize(letters, boundaries) : null;
}

/** Plain-English reason for a coding, spoken when the child misses it. `tools` limits it to what was asked. */
export function describeCoding(parsed, word, tools = MARKS, boundaries = new Set()) {
  const has = (mk) => tools.includes(mk) && parsed.some((p) => p.marks.includes(mk));
  const parts = [];
  if (has('box')) {
    const first = parsed.findIndex((p) => p.marks.includes('box'));
    const last = parsed.length - 1 - [...parsed].reverse().findIndex((p) => p.marks.includes('box'));
    parts.push(first === 0
      ? `A prefix is a beginning added before a base word. Here the prefix is ${word.slice(0, last + 1)} and the base word is ${word.slice(last + 1)}. Put a box around the whole prefix.`
      : `A suffix is an ending added to a base word. Here the base word is ${word.slice(0, first)} and the suffix is ${word.slice(first)}. Put a box around the whole suffix.`);
  }
  if (has('arc')) parts.push(`${groupsOf(parsed, 'arc').join(' and ')} work${groupsOf(parsed, 'arc').length > 1 ? '' : 's'} together as a combination or diphthong. Put an arc under ${groupsOf(parsed, 'arc').length > 1 ? 'them' : 'those letters'}.`);
  parsed.forEach((p, i) => {
    const next = parsed[i + 1]?.ch;
    const which = word.toLowerCase().indexOf('c') === i && word.toLowerCase().split('c').length > 2 ? 'first ' : '';
    if (tools.includes('kback') && p.marks.includes('kback'))
      parts.push(`The ${which}c${next ? ' before ' + next : ''} says /k/. It is a hard c, so give it a k-back.`);
    if (tools.includes('cedilla') && p.marks.includes('cedilla'))
      parts.push(`The ${which}c${next ? ' before ' + next : ''} says /s/. Before e, i or y, c is soft, so give it a cedilla.`);
  });
  if (has('bracket')) {
    const bi = parsed.findIndex((p) => p.marks.includes('bracket'));
    parts.push(`${word.slice(bi)} is a final, stable syllable. Put a bracket in front of it${tools.includes('strike') ? ' and cross out the silent e' : ''}.`);
  }
  if (has('schwa')) parts.push('An unstressed vowel that says uh gets a schwa.');
  if (has('voice')) parts.push('This letter is voiced, so give it a voice line.');
  if (tools.includes('divide') && boundaries.size) {
    const p = [...boundaries][0];
    parts.push(`Two consonants sit between the vowels. Divide between them: ${word.slice(0, p)} | ${word.slice(p)}.`);
  }
  if (has('strike') && has('macron') && !has('underline') && !has('bracket')) {
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
    // Adjacent underlined letters can be separate groups (sh + ee in sheep), so split each run into known groups.
    const KNOWN = ['eigh', 'igh', 'tch', 'dge'];
    const groups = [];
    for (const run of groupsOf(parsed, 'underline')) {
      if (KNOWN.includes(run)) groups.push(run);
      else for (let i = 0; i < run.length; i += 2) groups.push(run.slice(i, i + 2));
    }
    const sayGroup = (g) =>
      g.length === 4 ? `${g} is a quadrigraph: four letters, one sound.`
      : g.length === 3 ? `${g} is a trigraph: three letters, one sound.`
      : g.length === 2 ? `${g} is a team of two letters, one sound.`
      : '';
    const sizes = new Set(groups.map((g) => g.length));
    const which = sizes.size === 1 ? ({ 2: 'both letters', 3: 'all three letters', 4: 'all four letters' }[[...sizes][0]] || 'the letters') : 'every letter in each group';
    parts.push(`${groups.map(sayGroup).filter(Boolean).join(' ')} Underline ${which}.`);
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
  const detail = []; // per wrong letter: marks that should come off, marks still missing
  expected.forEach((e, i) => {
    if (key(e.marks) === key(state[i] || [])) return;
    badLetters.push(i);
    const want = new Set(e.marks.filter((m) => markTools.includes(m)));
    const got = new Set([...(state[i] || [])].filter((m) => markTools.includes(m)));
    detail.push({ i, extra: [...got].filter((m) => !want.has(m)), missing: [...want].filter((m) => !got.has(m)) });
  });
  const badBounds = [];
  if (tools.includes('divide')) {
    for (const p of new Set([...bounds, ...expectedBounds])) if (bounds.has(p) !== expectedBounds.has(p)) badBounds.push(p);
  }
  return { ok: !badLetters.length && !badBounds.length, badLetters, badBounds, detail };
}
