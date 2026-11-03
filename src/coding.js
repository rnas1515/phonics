// Saxon-style coding marks. Pure module (no DOM) so Node scripts can import it.
//
// Compact notation: one token per letter, separated by spaces. A letter may be
// followed by mark characters:  v = breve,  - = macron,  / = strike-through,  _ = underline
//   cake  -> "c a- k e/"      black -> "b l av c_ k_"      seed -> "s e_ e_ d"

const CODE = { v: 'breve', '-': 'macron', '/': 'strike', _: 'underline' };
export const MARK_CODE = { breve: 'v', macron: '-', strike: '/', underline: '_' };
export const MARKS = ['breve', 'macron', 'strike', 'underline'];

const VOWELS = 'aeiou';
// Letter teams that are coded with an underline under both letters.
const DIGRAPHS = ['ee', 'oo', 'ai', 'ay', 'oa', 'ea', 'ck', 'sh', 'th', 'ch', 'wh'];

export function parseCoded(str) {
  const toks = String(str).trim().split(/\s+/).filter(Boolean);
  if (!toks.length) throw new Error('Empty coded word');
  return toks.map((t) => {
    if (!/^[a-zA-Z]/.test(t)) throw new Error(`Bad token "${t}" (each token starts with a letter)`);
    const marks = [...t.slice(1)].map((c) => {
      if (!CODE[c]) throw new Error(`Unknown mark "${c}" in "${t}" (use v - / _)`);
      return CODE[c];
    });
    return { ch: t[0].toLowerCase(), marks: [...new Set(marks)] };
  });
}

export function serialize(parsed) {
  return parsed.map((p) => p.ch + p.marks.map((m) => MARK_CODE[m]).join('')).join(' ');
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

/** Plain-English reason for a coding, spoken when the child misses it. */
export function describeCoding(parsed, word) {
  const has = (mk) => parsed.some((p) => p.marks.includes(mk));
  const parts = [];
  if (has('strike')) {
    const vi = parsed.findIndex((p) => p.marks.includes('macron'));
    parts.push(
      `${word} has a sneaky e at the end. The e is silent and makes the ${vi >= 0 ? parsed[vi].ch : 'first vowel'} say its name. ` +
        'Put a macron on that vowel and cross out the e.'
    );
  } else if (has('macron')) {
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

/** Indices where the student's marks differ from the expected coding. */
export function mismatches(state, expected) {
  const bad = [];
  expected.forEach((e, i) => {
    if ((state[i] || null) !== (e.marks[0] || null)) bad.push(i);
  });
  return bad;
}
