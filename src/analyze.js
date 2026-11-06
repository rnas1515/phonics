// Word Lab analyzer: suggests school-style coding for any typed word and explains each step.
// Pure module (no DOM). It is a best guess from the rules the app knows, NOT an answer key:
// anything it is unsure about becomes a note instead of a mark.
import { serialize } from './coding.js';

const isV = (c) => 'aeiou'.includes(c);

// Words that do not follow the sound rules: learned by sight / exceptions to the sneaky-e rule.
const IRREGULAR = new Set([
  'the', 'a', 'i', 'are', 'said', 'were', 'what', 'from', 'where', 'of', 'was', 'two', 'they', 'you', 'your', 'to', 'do', 'does', 'who', 'one', 'once',
  'have', 'give', 'love', 'some', 'come', 'done', 'none', 'gone', 'move', 'above', 'dove', 'glove', 'shove', 'there', 'would', 'could', 'should', 'friend',
]);

// pattern, type, explanation, optional note
const PATS = [
  ['eigh', 'under', 'eigh is a quadrigraph: four letters make one sound (long a). Underline all four letters.'],
  ['igh', 'under', 'igh is a trigraph: three letters make one sound (long i). Underline all three letters.', 'The school chart seems to show extra marks inside igh, tch and dge (such as slashes). Ask your tutor which are needed.'],
  ['tch', 'under', 'tch is a trigraph: three letters make one sound (ch). Underline all three letters.', 'The school chart seems to show extra marks inside igh, tch and dge (such as slashes). Ask your tutor which are needed.'],
  ['dge', 'under', 'dge is a trigraph: three letters make one sound (j). Underline all three letters.', 'The school chart seems to show extra marks inside igh, tch and dge (such as slashes). Ask your tutor which are needed.'],
  ['ee', 'team', null], ['ai', 'team', null], ['ay', 'team', null], ['oa', 'team', null], ['ue', 'team', null], ['ie', 'team', null], ['ey', 'team', null],
  ['ea', 'under', 'ea is a vowel team: two letters, one sound. Underline both letters.', 'ea can say long e (leaf), short e (bread) or long a (steak). Listen for the sound. The school pattern for long e is a macron on the e and a slash through the a.'],
  ['oo', 'under', 'oo is a vowel team: two letters, one sound. Underline both letters.', 'oo has two sounds (moon and book). The school chart also adds a sound mark above it. Ask your tutor if it is required.'],
  ['aw', 'under', 'aw is a vowel team: two letters, one sound. Underline both letters.'],
  ['au', 'under', 'au is a vowel team: two letters, one sound. Underline both letters.'],
  ['ew', 'under', 'ew is a vowel team: two letters, one sound. Underline both letters.'],
  ['oi', 'arc', 'oi is a diphthong: a gliding sound. Put an arc under both letters.'],
  ['oy', 'arc', 'oy is a diphthong: a gliding sound. Put an arc under both letters.'],
  ['ou', 'arc', 'ou is a diphthong: a gliding sound. Put an arc under both letters.'],
  ['ow', 'arc', 'ow is a diphthong when it says ow, like cow. Put an arc under both letters.', 'ow can also say long o, like snow. If it does, code it like the other vowel teams: macron on the o, slash through the w, underline both.'],
  ['er', 'arc', 'er is a combination: the vowel and r work together. Put an arc under both letters.'],
  ['ir', 'arc', 'ir is a combination: the vowel and r work together. Put an arc under both letters.'],
  ['ur', 'arc', 'ur is a combination: the vowel and r work together. Put an arc under both letters.'],
  ['ar', 'arc', 'ar is a combination: the vowel and r work together. Put an arc under both letters.'],
  ['or', 'arc', 'or is a combination: the vowel and r work together. Put an arc under both letters.'],
  ['qu', 'arc', 'qu is a combination: q and u always travel together. Put an arc under both letters.'],
  ['wh', 'arc', 'wh is a combination. Put an arc under both letters.'],
  ['ck', 'under', 'ck is a digraph: two letters, one sound (k). Underline both letters.', 'On the school chart the c in ck may also be slashed. Ask your tutor if it is required.'],
  ['sh', 'under', 'sh is a digraph: two letters, one sound. Underline both letters.'],
  ['th', 'under', 'th is a digraph: two letters, one sound. Underline both letters.', 'th can be voiced (this) or unvoiced (thin). Voiced letters get a voice line. Ask your tutor if th needs one.'],
  ['ch', 'under', 'ch is a digraph: two letters, one sound. Underline both letters.'],
  ['ph', 'under', 'ph is a digraph: two letters, one sound (f). Underline both letters.'],
  ['ng', 'under', 'ng is a digraph: two letters, one sound. Underline both letters.'],
  ['kn', 'silent1', 'kn is a digraph. The k is silent: cross it out, and underline both letters.'],
  ['wr', 'silent1', 'wr is a digraph. The w is silent: cross it out, and underline both letters.'],
  ['gn', 'silent1', 'gn is a digraph. The g is silent: cross it out, and underline both letters.'],
];
const CONSONANT_GROUPS = new Set(['tch', 'dge', 'qu', 'wh', 'ck', 'sh', 'th', 'ch', 'ph', 'ng', 'kn', 'wr', 'gn']);
const TEAM_TEXT = (p) => `${p} is a vowel team: two letters, one sound. The school pattern is a macron on the first letter, a slash through the second, and an underline under both.`;

export function analyzeWord(raw) {
  const w = String(raw).toLowerCase().replace(/[^a-z]/g, '');
  const n = w.length;
  const marks = Array.from({ length: n }, () => []);
  const used = Array(n).fill(false);
  const group = Array(n).fill(null); // pattern group each letter belongs to
  const steps = [];
  const notes = new Set();
  const bounds = new Set();
  const put = (i, m) => { if (!marks[i].includes(m)) marks[i].push(m); };
  const step = (order, text, ms, bound) => steps.push({ order, text, marks: ms, bound });

  if (n < 2) return { word: w, irregular: false, steps, notes: [], coded: w, letters: [...w], marks, bounds, empty: true };
  if (IRREGULAR.has(w)) {
    return { word: w, irregular: true, letters: [...w], marks, bounds, steps, coded: serialize([...w].map((ch) => ({ ch, marks: [] }))),
      notes: [`"${w}" does not follow the usual sound rules, so we learn it by sight. I have no coding to suggest.`], empty: true };
  }

  // 1. final, stable syllable: consonant + le at the end (table, little, candle)
  let bracketAt = -1;
  if (n >= 4 && w.endsWith('le') && 'bcdfgkpstz'.includes(w[n - 3]) && [...w.slice(0, n - 3)].some(isV)) {
    bracketAt = n - 3;
    put(n - 3, 'bracket'); put(n - 1, 'strike');
    used[n - 3] = used[n - 2] = used[n - 1] = true;
    step(1, `${w.slice(n - 3)} is a final, stable syllable. Put a bracket in front of it and cross out the silent e.`, [[n - 3, 'bracket'], [n - 1, 'strike']]);
  }

  // 2. letter groups (digraphs, teams, arcs ...), longest match first, left to right
  const limit = bracketAt >= 0 ? bracketAt : n;
  for (let i = 0; i < limit; ) {
    let hit = null;
    for (const p of PATS) if (w.startsWith(p[0], i) && i + p[0].length <= limit && !used.slice(i, i + p[0].length).some(Boolean)) { hit = p; break; }
    if (!hit) { i++; continue; }
    const [pat, type, text, note] = hit;
    const idx = [...pat].map((_, k) => i + k);
    idx.forEach((j) => { used[j] = true; group[j] = { start: i, len: pat.length, cons: CONSONANT_GROUPS.has(pat) }; });
    const ms = [];
    if (type === 'under') idx.forEach((j) => { put(j, 'underline'); ms.push([j, 'underline']); });
    else if (type === 'arc') idx.forEach((j) => { put(j, 'arc'); ms.push([j, 'arc']); });
    else if (type === 'silent1') {
      put(i, 'strike'); ms.push([i, 'strike']);
      idx.forEach((j) => { put(j, 'underline'); ms.push([j, 'underline']); });
    } else { // team: macron on the first letter, slash through the second, underline both
      put(i, 'macron'); ms.push([i, 'macron']);
      put(i + 1, 'strike'); ms.push([i + 1, 'strike']);
      idx.forEach((j) => { put(j, 'underline'); ms.push([j, 'underline']); });
    }
    step(2, text || TEAM_TEXT(pat), ms);
    if (note) notes.add(note);
    i += pat.length;
  }

  // 3. sneaky e: vowel + consonant + final e
  if (w[n - 1] === 'e' && !used[n - 1] && n >= 3) {
    const j = n - 2;
    const start = group[j]?.cons ? group[j].start : j;
    const v = start - 1;
    if (!isV(w[j]) && v >= 0 && isV(w[v]) && !used[v]) {
      put(v, 'macron'); put(n - 1, 'strike'); used[v] = used[n - 1] = true;
      step(3, `${w} has a sneaky e at the end (vowel, consonant, e). The e is silent and makes the ${w[v]} say its name. Put a macron on the ${w[v]} and cross out the e.`, [[v, 'macron'], [n - 1, 'strike']]);
      if (w.endsWith('ve')) notes.add('A few words ending in ve (like have, give, love) do not follow the sneaky-e rule.');
    }
  }

  // 4. remaining vowels: closed syllable = short (breve), open at the end of the word = long (macron)
  // A likely suffix (-ed, -ing, -est, -ly) is boxed, not read as a syllable, so its vowels are left alone.
  let sufStart = n;
  for (const suf of ['ing', 'est', 'ed', 'ly']) if (w.endsWith(suf) && n - suf.length >= 3) { sufStart = n - suf.length; break; }
  // a final y after a consonant acts as a vowel (baby, happy, city)
  const yVowel = (j) => w[j] === 'y' && j === n - 1 && j > 0 && !isV(w[j - 1]);
  let divided = false;
  for (let i = 0; i < n; i++) {
    if (used[i] || !isV(w[i]) || (bracketAt >= 0 && i >= bracketAt) || i >= sufStart) continue;
    let j = i + 1, k = 0;
    while (j < limit && !isV(w[j]) && !yVowel(j) && !(group[j] && !group[j].cons)) { j += group[j] ? group[j].len : 1; k++; }
    const reachedBracket = bracketAt >= 0 && j >= bracketAt;
    const atEnd = j >= n;
    const closed = () => { put(i, 'breve'); used[i] = true; return [[i, 'breve']]; };
    if (reachedBracket) {
      if (k === 0) { put(i, 'macron'); step(3, `The ${w[i]} is at the end of its syllable (open), so it says its name. Put a macron on it.`, [[i, 'macron']]); }
      else step(3, `The ${w[i]} is followed by a consonant before the bracket, so it is short. Put a breve on it.`, closed());
    } else if (atEnd && k === 0) {
      if (n === 2 || !w.slice(0, i).split('').some(isV)) { put(i, 'macron'); step(3, `The ${w[i]} is at the end of the word (open), so it says its name. Put a macron on it.`, [[i, 'macron']]); }
      else notes.add(`The ${w[i]} at the end is an unstressed vowel. It might need a schwa or another mark. Ask your tutor.`);
    } else if (atEnd) {
      step(3, `The ${w[i]} is followed by a consonant, so it is short. Put a breve on it.`, closed());
    } else if (k >= 2) {
      step(3, `The ${w[i]} is followed by two consonants, so it is short. Put a breve on it.`, closed());
      if (!divided) {
        const unit = group[i + 1] ? group[i + 1].len : 1;
        const p = i + 1 + unit;
        if (p < n && !bounds.size && k === 2 && sufStart === n) { bounds.add(p); divided = true; step(0, `${w.slice(0, p)} | ${w.slice(p)}: two consonants sit between the vowels (VCCV), so divide between them.`, [], p); }
        else if (k >= 3) notes.add('With three consonants in a row the dividing line can go in more than one place. Ask your tutor.');
      }
    } else if (k === 1) {
      notes.add(`The ${w[i]} followed by one consonant and then another vowel (V C V) can be open or closed (like ta|ble or tab|le). Listen to the word and ask your tutor. I have not marked it.`);
    }
  }

  // 5. hard and soft c
  for (let i = 0; i < n; i++) {
    if (w[i] !== 'c' || used[i]) continue;
    const soft = 'eiy'.includes(w[i + 1] || '');
    put(i, soft ? 'cedilla' : 'kback'); used[i] = true;
    step(4, soft ? `The c comes before ${w[i + 1]}, so it is a soft c and says s. Give it a cedilla.` : `The c says k, so it is a hard c. Give it a k-back.`, [[i, soft ? 'cedilla' : 'kback']]);
  }

  // notes for things I do not mark
  for (let i = 0; i < n; i++) if (w[i] === 'g' && !used[i] && 'eiy'.includes(w[i + 1] || '') && !group[i]) { notes.add('g before e, i or y often says j (like gem). The pages I have do not show a mark for soft g, so none is shown.'); break; }
  if (w[n - 1] === 'y' && !(group[n - 1])) notes.add('y at the end can act as a vowel (fly says long i, baby says long e). I do not have the school mark for y, so none is shown.');
  for (const p of ['un', 're', 'pre', 'dis', 'mis']) if (w.startsWith(p) && n - p.length >= 3) { notes.add(`Does ${w} start with the prefix "${p}"? If what is left ("${w.slice(p.length)}") is a word, put a box around the prefix.`); break; }
  for (const s of ['ing', 'ed', 'ly', 'est']) if (w.endsWith(s) && n - s.length >= 3) { notes.add(`Does ${w} end with the suffix "${s}"? If what is left ("${w.slice(0, n - s.length)}") is a word, put a box around the suffix.`); break; }
  if (steps.length > 1 && n >= 8) notes.add('Longer words are harder. Accent marks and some syllable marks are not shown here.');

  steps.sort((a, b) => a.order - b.order);
  const letters = [...w];
  const coded = serialize(letters.map((ch, i) => ({ ch, marks: marks[i] })), bounds);
  return { word: w, irregular: false, letters, marks, bounds, steps, notes: [...notes], coded, empty: steps.length === 0 };
}
