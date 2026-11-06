// Lesson validation + normalisation. Pure module (no DOM): used by the app, the tutor form and `npm test`.
import { parseCodedFull, autoCode, describeCoding, teamFullAlt, ALL_TOOLS, MARKS } from './coding.js';

export const TYPES = ['code', 'sort', 'fill', 'sightword', 'comprehension'];

const DEFAULT_INSTRUCTIONS = {
  code: 'Pick a tool, then tap letters to code the word. Press Check when you are done.',
  sort: 'Listen to the word. Then tap the group it belongs to.',
  fill: 'Fill in the missing letters.',
  sightword: 'Read the word. Tap I read it, or tap Hear it if you need help.',
  comprehension: 'Read the story. Then answer the question.',
};

export const DEFAULT_KINDS = [
  { id: 'short', label: 'A short vowel, all alone' },
  { id: 'consonant', label: 'A consonant' },
  { id: 'team', label: 'Part of a vowel team' },
];

const KIND_PHRASE = {
  short: 'a short vowel, all alone',
  consonant: 'a consonant',
  team: 'part of a vowel team',
};

/** Work out the stem / ending / "one letter before /k/" for a ck-or-k word. */
export function deriveCk(word) {
  const w = word.toLowerCase();
  if (w.endsWith('ck')) {
    const stem = w.slice(0, -2);
    return { stem, answer: 'ck', before: stem.slice(-1), beforeKind: 'short' };
  }
  if (w.endsWith('k')) {
    const stem = w.slice(0, -1);
    const before = stem.slice(-1);
    return { stem, answer: 'k', before, beforeKind: 'aeiou'.includes(before) ? 'team' : 'consonant' };
  }
  return null;
}

export function ckWhy(word, d) {
  const lead = `Look at the ONE letter right before the k sound. It is "${d.before}". `;
  if (d.beforeKind === 'short')
    return `${lead}It is a short vowel, all alone. So we spell the end with c k: ${word}.`;
  if (d.beforeKind === 'team')
    return `${lead}It is part of the vowel team "${d.stem.slice(-2)}", not a short vowel alone. So we use just k: ${word}.`;
  return `${lead}It is a consonant, not a short vowel. So we use just k: ${word}.`;
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const str = (x) => typeof x === 'string' && x.trim().length > 0;

function defaultPass(n) {
  const of = Math.min(6, n);
  return { correct: Math.max(1, Math.round((of * 2) / 3)), of };
}

/** Returns { lesson, errors }. `lesson` is null when errors make it unusable. */
export function normalizeLesson(raw, source = 'built-in') {
  const errors = [];
  const err = (m) => errors.push(m);
  if (!isObj(raw)) return { lesson: null, errors: ['Lesson must be a JSON object'] };

  const L = JSON.parse(JSON.stringify(raw));
  for (const f of ['id', 'title', 'skill']) if (!str(L[f])) err(`Missing "${f}"`);
  if (L.saxonLesson != null && !Number.isInteger(L.saxonLesson)) err('"saxonLesson" must be a whole number or null');
  L.saxonLesson ??= null;
  L.kind = L.kind === 'checkpoint' ? 'checkpoint' : 'lesson';
  if (L.grade != null && !(Number.isInteger(L.grade) && L.grade >= 1)) err('"grade" must be a whole number (1 = 1st grade) or left out');
  L.grade ??= 2; // the grade a child must be in (or above) to see this lesson by default
  L.priority = Number.isFinite(L.priority) ? L.priority : 5;
  L.defaultActive = L.defaultActive !== false;
  L.inReview = !!L.inReview;
  L.rule ??= '';
  L.trickText ??= L.rule;
  L.say = str(L.say) ? L.say : [L.title, L.rule].filter(Boolean).join('. ');
  L.source = source;

  if (L.example != null) {
    if (!isObj(L.example) || !str(L.example.word)) err('"example" needs a "word"');
  }
  if (L.bands != null && !Array.isArray(L.bands)) err('"bands" must be a list');

  // Optional "what do you notice?" discovery: sort a few words, then answer one question to reveal the rule.
  if (L.discover != null) {
    const d = L.discover;
    const ok = isObj(d) && Array.isArray(d.groups) && d.groups.length >= 2 && d.groups.every((g) => str(g.id) && str(g.label)) &&
      Array.isArray(d.items) && d.items.length >= 2 && d.items.every((i) => str(i.word) && d.groups.some((g) => g.id === i.answer)) &&
      str(d.question) && Array.isArray(d.options) && d.options.length >= 2 && d.options.filter((o) => o.correct).length === 1 && d.options.every((o) => str(o.label));
    if (!ok) err('"discover" needs groups (>=2), items {word, answer=group id}, a question, and options with exactly one {correct:true}');
    else {
      d.intro = str(d.intro) ? d.intro : 'Sort these words. Then tell me what you notice.';
      d.act = { type: 'sort', instruction: d.intro, categories: d.groups,
        items: d.items.map((i) => ({ ...i, why: i.why || d.groups.find((g) => g.id === i.answer).why || `${i.word} goes with "${d.groups.find((g) => g.id === i.answer).label}".` })) };
    }
  }

  if (!Array.isArray(L.activities) || !L.activities.length) {
    err('"activities" must be a non-empty list');
    L.activities = [];
  }

  L.activities.forEach((a, ai) => {
    const at = `Activity ${ai + 1}`;
    if (!isObj(a)) return err(`${at}: must be an object`);
    if (!TYPES.includes(a.type)) return err(`${at}: type must be one of ${TYPES.join(', ')}`);
    if (!Array.isArray(a.items) || !a.items.length) return err(`${at}: "items" must be a non-empty list`);
    a.instruction = str(a.instruction) ? a.instruction : DEFAULT_INSTRUCTIONS[a.type];
    a.optional = !!a.optional;

    if (a.type === 'code') {
      a.tools ??= MARKS;
      if (!Array.isArray(a.tools) || !a.tools.length || a.tools.some((t) => !ALL_TOOLS.includes(t)))
        err(`${at}: "tools" must be a list of ${ALL_TOOLS.join(', ')}`);
      if (a.alsoAccept != null && !['team-full', 'ee-full'].includes(a.alsoAccept)) err(`${at}: "alsoAccept" can only be "team-full"`);
    }
    if (a.type === 'sort') {
      if (!Array.isArray(a.categories) || a.categories.length < 2 || a.categories.some((c) => !str(c.id) || !str(c.label)))
        err(`${at}: "categories" needs at least two {id, label}`);
    }
    if (a.type === 'fill') {
      if (a.oneLetter) {
        a.choices ??= ['ck', 'k'];
        a.kinds ??= DEFAULT_KINDS;
        a.ruleStrip ??= null;
      } else if (!Array.isArray(a.choices) || a.choices.length < 2) err(`${at}: "choices" needs at least two options`);
    }
    if (a.type === 'sightword') a.marking = a.marking === 'tutor' ? 'tutor' : 'self';

    a.items.forEach((it, ii) => {
      const where = `${at}, item ${ii + 1}`;
      if (!isObj(it)) return err(`${where}: must be an object`);
      try {
        if (a.type === 'code') {
          if (!str(it.word)) return err(`${where}: missing "word"`);
          const needsExplicit = (a.tools || []).some((t) => !MARKS.includes(t));
          if (needsExplicit && !str(it.answer)) return err(`${where}: this activity uses box/divide marks, so "answer" must be written out`);
          it.answer = str(it.answer) ? it.answer : autoCode(it.word);
          const { letters, boundaries } = parseCodedFull(it.answer);
          if (letters.map((p) => p.ch).join('') !== it.word.toLowerCase())
            err(`${where}: coded answer "${it.answer}" does not spell "${it.word}"`);
          it.why ??= describeCoding(letters, it.word, a.tools, boundaries);
          if (a.alsoAccept) {
            // School notation for vowel teams (ee, ai, ay, oa): macron first vowel, slash second, underline both.
            const alt = teamFullAlt(it.answer);
            if (alt) it.acceptAlso = [alt];
          }
        } else if (a.type === 'sort') {
          if (!str(it.word)) return err(`${where}: missing "word"`);
          const cat = (a.categories || []).find((c) => c.id === it.answer);
          if (!cat) return err(`${where}: answer "${it.answer}" is not a category id`);
          it.why ??= cat.why || `${it.word} goes with "${cat.label}".`;
        } else if (a.type === 'fill' && a.oneLetter) {
          if (!str(it.word)) return err(`${where}: missing "word"`);
          const explicit = str(it.stem) && str(it.answer) && str(it.beforeKind);
          const d = explicit ? null : deriveCk(it.word);
          if (!explicit && !d) return err(`${where}: "${it.word}" does not end in ck or k (or give "stem", "answer", "beforeKind" and "why" yourself)`);
          if (explicit && !str(it.why)) return err(`${where}: explicit items need a "why"`);
          Object.assign(it, { ...(d || {}), ...it });
          if (!a.choices.includes(it.answer)) err(`${where}: answer "${it.answer}" is not in "choices"`);
          it.before ??= it.stem.slice(-1);
          it.why ??= ckWhy(it.word, it);
          if (!a.kinds.some((k) => k.id === it.beforeKind)) err(`${where}: unknown beforeKind "${it.beforeKind}"`);
        } else if (a.type === 'fill') {
          if (!str(it.word) || !str(it.pattern) || !it.pattern.includes('_') || !str(it.answer))
            return err(`${where}: needs "word", "pattern" (with _ for the gap) and "answer"`);
          if (!a.choices.includes(it.answer)) err(`${where}: answer "${it.answer}" is not in "choices"`);
          it.why ??= `${it.word} is spelled with ${it.answer}.`;
        } else if (a.type === 'sightword') {
          if (!str(it.word)) return err(`${where}: missing "word"`);
          it.why ??= `This word is "${it.word}". Some words do not follow the rules, so we learn them by sight.`;
        } else if (a.type === 'comprehension') {
          if (!str(it.passage) || !str(it.question) || !Array.isArray(it.choices) || it.choices.length < 2)
            return err(`${where}: needs "passage", "question" and "choices"`);
          if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer >= it.choices.length)
            return err(`${where}: "answer" must be the index of the right choice`);
          it.word ??= `story: ${it.question}`;
          it.why ??= `The story says: ${it.passage}`;
        }
      } catch (e) {
        err(`${where}: ${e.message}`);
      }
    });

    const n = a.items.length;
    if (a.passRule == null) a.passRule = defaultPass(n);
    else if (!isObj(a.passRule) || !Number.isInteger(a.passRule.correct) || !Number.isInteger(a.passRule.of))
      err(`${at}: "passRule" must look like {"correct":4,"of":6}`);
    else if (a.passRule.of > n) a.passRule = { correct: Math.min(a.passRule.correct, n), of: n };
  });

  return { lesson: errors.length ? null : L, errors };
}
