// `npm test`: validates every lesson file and sanity-checks the coding helpers.
import { readdirSync, readFileSync } from 'node:fs';
import { normalizeLesson, deriveCk } from '../src/validate.js';
import { autoCode } from '../src/coding.js';

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
if (failed) { console.error(`\n${failed} problem(s)`); process.exit(1); }
console.log('\nAll lesson checks passed');
