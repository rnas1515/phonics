// Build a practice lesson from the words a child missed on an assessment (pure, no DOM).
import { analyzeWord } from './analyze.js';
import { parseCodedFull, MARKS } from './coding.js';
import { shuffle } from './util.js';

const CLEAN = (w) => String(w).toLowerCase().replace(/[^a-z']/g, '');
const CODE_TYPES = ['code', 'sort', 'fill'];

/** The skill a typed word belongs to, if some built-in lesson already teaches that exact word. */
export function guessSkill(word, lessons) {
  const w = CLEAN(word);
  for (const l of lessons) {
    if (l.kind !== 'lesson' || l.assessment) continue;
    for (const a of l.activities) if (CODE_TYPES.includes(a.type) && a.items.some((i) => i.word === w)) return l.skill;
  }
  return '';
}

/**
 * words: [{ word, skill?, sentence? }]. lessons: normalized lessons (to reuse their words and settings).
 * Returns { lesson (raw JSON, ready to save), summary, errors? }.
 */
export function buildFixLesson({ date, grade = 2, words, lessons, title }) {
  const seen = new Set();
  const list = words
    .map((x) => ({ word: CLEAN(x.word), skill: x.skill || '', sentence: String(x.sentence || '').trim() }))
    .filter((x) => x.word.length > 1 && !seen.has(x.word) && seen.add(x.word));
  if (!list.length) return { lesson: null, errors: ['Add at least one word.'] };

  const base = lessons.filter((l) => l.kind === 'lesson' && !l.assessment);
  const bySkill = (s) => base.find((l) => l.skill === s);
  const findItem = (w) => {
    for (const l of base) for (const a of l.activities) if (a.type === 'code') { const it = a.items.find((i) => i.word === w); if (it) return { it, a }; }
    return null;
  };

  const notes = [];
  const codeItems = [];
  const tools = new Set(MARKS);
  for (const x of list) {
    const known = findItem(x.word);
    const sug = analyzeWord(x.word);
    let answer = known?.it.answer;
    if (!answer && !sug.empty && sug.marks.some((m) => m.length)) {
      answer = sug.coded;
      notes.push(`${x.word}: coding is a suggestion from the Word Lab rules. Check it with the tutor.`);
    }
    if (!answer) continue; // irregular or nothing to mark: sight-word practice only
    const parsed = parseCodedFull(answer);
    parsed.letters.forEach((l) => l.marks.forEach((m) => tools.add(m)));
    if (parsed.boundaries?.size) tools.add('divide');
    (known?.a.tools || []).forEach((t) => tools.add(t));
    codeItems.push({ word: x.word, answer });
  }

  // Skills the tutor picked (or that were found): reuse their first practice activity for "more like these".
  const skills = [...new Set(list.map((x) => x.skill || guessSkill(x.word, base)).filter(Boolean))];
  const sources = skills.map(bySkill).filter(Boolean);
  const activities = [];
  const n = (k) => ({ correct: Math.max(1, Math.ceil((k * 2) / 3)), of: k });

  if (codeItems.length) {
    const of = Math.min(6, codeItems.length);
    activities.push({ type: 'code', instruction: 'Code each word from your assessment. Use the tools.', tools: [...tools], passRule: n(of), items: codeItems });
  }
  const missed = new Set(list.map((x) => x.word));
  for (const l of sources) {
    const act = l.activities.find((a) => !a.optional && CODE_TYPES.includes(a.type));
    if (!act) continue;
    const items = shuffle(act.items.filter((i) => !missed.has(i.word))).slice(0, 8);
    if (items.length < 3) continue;
    const { ...clone } = JSON.parse(JSON.stringify(act));
    clone.items = JSON.parse(JSON.stringify(items));
    clone.section = undefined; clone.optional = false;
    clone.passRule = n(Math.min(6, items.length));
    activities.push(clone);
  }
  activities.push({
    type: 'sightword',
    instruction: 'Read each word from your assessment out loud. Tap I read it, or tap Hear it if you need help.',
    passRule: n(Math.min(6, list.length)),
    items: list.map((x) => (x.sentence ? { word: x.word, sentence: x.sentence } : { word: x.word })),
  });

  const stamp = date.replace(/-/g, '');
  const id = `fix-${stamp}-${Math.random().toString(36).slice(2, 6)}`;
  const trick = sources.map((l) => l.trickText).filter(Boolean).slice(0, 2).join(' ');
  const shown = list.slice(0, 5).map((x) => x.word).join(', ') + (list.length > 5 ? ' and more' : '');
  const lesson = {
    id, title: title || `Fix-it case ${date}`, saxonLesson: null, skill: id, assessment: true, grade, priority: 0, defaultActive: false,
    rule: `Let us fix the words from your assessment: ${shown}.`,
    trickText: trick || 'Say the word slowly. Listen for each sound, then look for the letters that team up or stay silent.',
    say: `New case: fix it! We will practice the words from your assessment: ${shown}. You can do this.`,
    activities,
  };
  return { lesson, summary: { coded: codeItems.length, sight: list.length, similar: activities.length - 1 - (codeItems.length ? 1 : 0), notes } };
}
