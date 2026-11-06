// `npm test`: validates every lesson file and sanity-checks the coding helpers.
import { readdirSync, readFileSync } from 'node:fs';
import { normalizeLesson, deriveCk } from '../src/validate.js';
import { autoCode, parseCodedFull, gradeCoding, teamFullAlt, CONFLICTS, describeCoding, splitRun } from '../src/coding.js';

let failed = 0;
const eq = (name, got, want) => {
  if (got !== want) { failed++; console.error(`FAIL ${name}: got "${got}", want "${want}"`); }
};

// coding helper expectations
eq('cake', autoCode('cake'), 'c a- k e/');
eq('smile', autoCode('smile'), 's m i- l e/');
eq('cute', autoCode('cute'), 'c u- t e/');
eq('black', autoCode('black'), 'b l av c_ k_');
eq('quick', autoCode('quick'), 'q u iv c_ k_');
eq('queen', autoCode('queen'), 'q u e_ e_ n');
eq('three', autoCode('three'), 't_ h_ r e_ e_');
eq('shook', autoCode('shook'), 's_ h_ o_ o_ k');
eq('hop', autoCode('hop'), 'h ov p');
eq('he', autoCode('he'), 'h e-');
// ck / k rule engine: the ONE letter before /k/
const kinds = { book: 'team', click: 'short', shook: 'team', cheek: 'team', struck: 'short', park: 'consonant', sunk: 'consonant', milk: 'consonant', quick: 'short' };
for (const [w, k] of Object.entries(kinds)) eq(`ck-kind ${w}`, deriveCk(w).beforeKind, k);
eq('ck answer click', deriveCk('click').answer, 'ck');
eq('ck answer book', deriveCk('book').answer, 'k');

// Acceptance tests from the reference spec: spans, wrong marks, boundaries, target-only grading.
const grade = (coded, picks, bounds = [], tools) => {
  const e = parseCodedFull(coded);
  const state = e.letters.map(() => new Set());
  for (const [i, m] of picks) state[i].add(m);
  return gradeCoding(state, new Set(bounds), e.letters, e.boundaries, tools).ok;
};
eq('sleep ee underline both accepted', grade('s l e_ e_ p', [[2, 'underline'], [3, 'underline']], [], ['underline']), true);
eq('sleep underline one letter rejected', grade('s l e_ e_ p', [[2, 'underline']], [], ['underline']), false);
eq('sleep full notation (alt) accepted', grade('s l e-_ e/_ p', [[2, 'macron'], [2, 'underline'], [3, 'strike'], [3, 'underline']], [], ['breve', 'macron', 'strike', 'underline']), true);
eq('weekly suffix box [4,6) accepted', grade('w e e k l# y#', [[4, 'box'], [5, 'box']], [], ['box']), true);
eq('weekly box [3,6) rejected (k is base)', grade('w e e k l# y#', [[3, 'box'], [4, 'box'], [5, 'box']], [], ['box']), false);
eq('trusted underline instead of box rejected', grade('t r u s t e# d#', [[5, 'underline'], [6, 'underline']], [], ['box']), false);
eq('focused suffix task ignores missing vowel marks', grade('t r uv s t e# d#', [[5, 'box'], [6, 'box']], [], ['box']), true);
eq('under divider at 2 accepted', grade('u n | d e r', [], [2], ['divide']), true);
eq('under divider at 3 rejected', grade('u n | d e r', [], [3], ['divide']), false);
eq('missing divider rejected', grade('u n | d e r', [], [], ['divide']), false);
// a vowel with both a breve and a macron is wrong, and the feedback says which letter has the extra mark
{
  const e = parseCodedFull('c u- t e/');
  const st = e.letters.map(() => new Set());
  st[1].add('breve'); st[1].add('macron'); st[3].add('strike');
  const g = gradeCoding(st, new Set(), e.letters, e.boundaries);
  eq('stacked breve+macron rejected', g.ok, false);
  eq('detail flags extra on u', JSON.stringify(g.detail[0]), JSON.stringify({ i: 1, extra: ['breve'], missing: [] }));
  eq('breve conflicts with macron', CONFLICTS.breve.includes('macron') && CONFLICTS.macron.includes('breve'), true);
}
// tips name the whole group, not made-up pairs
{
  const tip = (coded, word) => { const f = parseCodedFull(coded); return describeCoding(f.letters, word, ['underline'], f.boundaries); };
  eq('weigh tip names the quadrigraph', /eigh is a quadrigraph: four letters, one sound\. Underline all four letters\./.test(tip('w e_ i_ g_ h_', 'weigh')), true);
  eq('night tip names the trigraph', /igh is a trigraph/.test(tip('n i_ g_ h_ t', 'night')), true);
  eq('sheep tip keeps sh and ee apart', /sh is a team.*ee is a team/.test(tip('s_ h_ e_ e_ p', 'sheep')), true);
  eq('rain tip: a pair', tip('r a_ i_ n', 'rain'), 'ai is a team of two letters, one sound. Underline both letters.');
}
eq('splitRun sheep', JSON.stringify(splitRun('shee')), JSON.stringify(['sh', 'ee']));
eq('splitRun eigh stays whole', JSON.stringify(splitRun('eigh')), JSON.stringify(['eigh']));
eq('splitRun igh stays whole', JSON.stringify(splitRun('igh')), JSON.stringify(['igh']));
// school notation: arcs, k-back / cedilla, brackets, vowel-team full pattern, prefix box
eq('arc under both letters of bird', grade('b i~ r~ d', [[1, 'arc'], [2, 'arc']], [], ['arc']), true);
eq('arc on one letter only rejected', grade('b i~ r~ d', [[1, 'arc']], [], ['arc']), false);
eq('underline instead of arc rejected', grade('b i~ r~ d', [[1, 'underline'], [2, 'underline']], [], ['arc']), false);
eq('hard c gets k-back', grade('c` a t', [[0, 'kback']], [], ['kback', 'cedilla']), true);
eq('soft c with k-back rejected', grade('c, e n t', [[0, 'kback']], [], ['kback', 'cedilla']), false);
eq('stable syllable bracket + slashed e', grade('t a- b[ l e/', [[2, 'bracket'], [4, 'strike']], [], ['bracket', 'strike']), true);
eq('bracket on wrong letter rejected', grade('t a- b[ l e/', [[3, 'bracket'], [4, 'strike']], [], ['bracket', 'strike']), false);
eq('prefix box accepted', grade('u# n# d o', [[0, 'box'], [1, 'box']], [], ['box']), true);
eq('team-full: ee', teamFullAlt('s l e_ e_ p'), 's l e-_ e/_ p');
eq('team-full: ai', teamFullAlt('r a_ i_ n'), 'r a-_ i/_ n');
eq('team-full: ay', teamFullAlt('d a_ y_'), 'd a-_ y/_');
eq('team-full: oa', teamFullAlt('b o_ a_ t'), 'b o-_ a/_ t');
for (const [a, b] of [['l e_ a_ f', 'l e-_ a/_ f'], ['s n o_ w_', 's n o-_ w/_'], ['g l u_ e_', 'g l u-_ e/_'], ['p i_ e_', 'p i-_ e/_'], ['k e_ y_', 'k e-_ y/_']]) eq('team-full ' + a, teamFullAlt(a), b);
eq('team-full: not applied to oo', teamFullAlt('m o_ o_ n'), null);
for (const [w, e] of [['seek', 'k'], ['sick', 'ck'], ['bank', 'k'], ['back', 'ck'], ['peck', 'ck'], ['peek', 'k'], ['duck', 'ck'], ['dusk', 'k']])
  eq(`ending of ${w}`, deriveCk(w).answer, e);
// every lesson: coded answers keep the word's spelling and fall inside the word
for (const f of readdirSync(new URL('../lessons/', import.meta.url)).filter((f) => f.endsWith('.json'))) {
  const { lesson } = normalizeLesson(JSON.parse(readFileSync(new URL('../lessons/' + f, import.meta.url), 'utf8')));
  for (const a of lesson?.activities || []) if (a.type === 'code') for (const it of a.items) {
    const { letters, boundaries } = parseCodedFull(it.answer);
    eq(`${f} ${it.word} spelling kept`, letters.map((l) => l.ch).join(''), it.word.toLowerCase());
    for (const p of boundaries) eq(`${f} ${it.word} boundary ${p} in range`, p > 0 && p < letters.length, true);
  }
}

// Word Lab: suggested coding follows the school's examples; unsure cases become notes, not marks
import { analyzeWord } from '../src/analyze.js';
for (const [w, c] of [
  ['cake', 'c` a- k e/'], ['cat', 'c` av t'], ['black', 'b l av c_ k_'], ['sleep', 's l e-_ e/_ p'], ['table', 't a- b[ l e/'],
  ['little', 'l iv t t[ l e/'], ['candle', 'c` av n d[ l e/'], ['cent', 'c, ev n t'], ['star', 's t a~ r~'], ['boy', 'b o~ y~'],
  ['knit', 'k/_ n_ iv t'], ['night', 'n i_ g_ h_ t'], ['napkin', 'n av p | k iv n'], ['under', 'uv n | d e~ r~'], ['coin', 'c` o~ i~ n'],
  ['dish', 'd iv s_ h_'], ['go', 'g o-'], ['quick', 'q~ u~ iv c_ k_'], ['jumped', 'j uv m p e d'], ['baby', 'b a b y'], ['face', 'f a- c, e/'],
]) eq('word lab ' + w, analyzeWord(w).coded, c);
eq('word lab: sight word has no coding', analyzeWord('said').empty, true);
eq('word lab: ve exception noted', analyzeWord('have').irregular, true);

// speech is split into short pieces, nothing is lost, order is kept
import { splitSpeech } from '../src/tts.js';
{
  const long = "Today's case is the sneaky e. When a word ends with a vowel, a consonant, and an e, the e is silent. It sneaks in and makes the first vowel say its name. Put a macron on the vowel and cross out the e, like in cake, which is a very long sentence with commas, and more words, and still more words to make it longer than one hundred forty characters in total.";
  const parts = splitSpeech(long);
  eq('speech pieces are short', parts.every((p) => p.length <= 140), true);
  eq('speech keeps every word, in order', parts.join(' ').replace(/\s+/g, ' '), long.replace(/\s+/g, ' '));
  eq('short text is one piece', splitSpeech('Nice work!').length, 1);
  eq('empty text is nothing', splitSpeech('   ').length, 0);
}

// reward games: 1 token per 5 lessons passed, each lesson counted once, bank of 3
import { applyCount, applySpend, emptyRewards } from '../src/rewardlogic.js';
{
  const r = emptyRewards();
  for (let i = 1; i <= 4; i++) applyCount(r, 'l' + i);
  eq('4 lessons: no token yet', r.tokens + '/' + r.progress, '0/4');
  eq('5th lesson earns a token', applyCount(r, 'l5').earnedToken, true);
  eq('progress resets after a token', r.tokens + '/' + r.progress, '1/0');
  eq('same lesson again is ignored', applyCount(r, 'l5').counted, false);
  eq('ignored repeat does not move progress', r.progress, 0);
  for (let i = 6; i <= 15; i++) applyCount(r, 'l' + i);
  eq('15 lessons: 3 tokens', r.tokens, 3);
  for (let i = 16; i <= 20; i++) applyCount(r, 'l' + i);
  eq('shelf is capped at 3', r.tokens, 3);
  eq('overflow reward is noted, not banked', r.lost, 1);
  eq('spend one', applySpend(r), true);
  eq('tokens after spend', r.tokens, 2);
  const e = emptyRewards();
  eq('cannot spend with none', applySpend(e), false);
}

// voice ranking: natural voices beat robotic ones
import { scoreVoice } from '../src/tts.js';
const V = (name, lang = 'en-US') => ({ name, lang });
eq('natural beats default', scoreVoice(V('Microsoft Aria Online (Natural) - English (United States)')) > scoreVoice(V('Microsoft David - English (United States)')), true);
eq('premium beats compact', scoreVoice(V('Ava (Premium)')) > scoreVoice(V('Samantha (Compact)')), true);
eq('novelty voices excluded', scoreVoice(V('Zarvox')) < 0, true);
eq('US english preferred', scoreVoice(V('Google US English', 'en-US')) > scoreVoice(V('Google UK English Female', 'en-GB')), true);

const dir = new URL('../lessons/', import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const { lesson, errors } = normalizeLesson(JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
  if (errors.length) { failed++; console.error(`FAIL ${f}:\n  - ${errors.join('\n  - ')}`); }
  else console.log(`ok  ${f}  (${lesson.activities.map((a) => `${a.type}×${a.items.length}`).join(', ')})`);
}
// curriculum.json must reference real skills
const cur = JSON.parse(readFileSync(new URL('../curriculum.json', import.meta.url), 'utf8'));
const skills = new Set(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')).skill));
for (const c of cur.skills) if (!skills.has(c.skill)) { failed++; console.error(`FAIL curriculum.json: unknown skill "${c.skill}"`); }
// schedule.json must only name real skills
const sched = JSON.parse(readFileSync(new URL('../schedule.json', import.meta.url), 'utf8'));
for (const wk of sched.weeks) for (const sk of wk.skills) if (!skills.has(sk)) { failed++; console.error(`FAIL schedule.json ${wk.date}: unknown skill "${sk}"`); }
if (failed) { console.error(`\n${failed} problem(s)`); process.exit(1); }
console.log('\nAll lesson checks passed');
