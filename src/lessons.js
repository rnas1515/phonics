import { normalizeLesson } from './validate.js';
import { getCustomLessons, getProgress, isActive } from './store.js';

// Every JSON file dropped in /lessons is picked up automatically at build time.
const files = import.meta.glob('../lessons/*.json', { eager: true, import: 'default' });

export const problems = [];

export function allLessons() {
  problems.length = 0;
  const out = [];
  const seen = new Set();
  const add = (raw, source, name) => {
    const { lesson, errors } = normalizeLesson(raw, source);
    if (!lesson) return problems.push({ name, errors });
    if (seen.has(lesson.id)) return problems.push({ name, errors: [`Duplicate lesson id "${lesson.id}"`] });
    seen.add(lesson.id);
    out.push(lesson);
  };
  for (const [path, raw] of Object.entries(files)) add(raw, 'built-in', path.split('/').pop());
  for (const raw of getCustomLessons()) add(raw, 'custom', raw?.title || 'custom lesson');
  return out.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
}

export const getLesson = (id) => allLessons().find((l) => l.id === id);

export const isMastered = (lesson) => !!getProgress().skills[lesson.skill]?.masteredAt;

export function accuracy(skill) {
  const k = getProgress().skills[skill];
  return k && k.attempts ? k.correct / k.attempts : null;
}

/** Today's mission: highest-priority active lesson that is not mastered yet. */
export function suggestNext(lessons = allLessons().filter(isActive)) {
  const lessonsOnly = lessons.filter((l) => l.kind === 'lesson');
  const todo = lessonsOnly.filter((l) => !isMastered(l));
  if (todo.length) return { lesson: todo[0], why: 'next' };
  const cp = lessons.find((l) => l.kind === 'checkpoint');
  if (cp) return { lesson: cp, why: 'checkpoint' };
  return { lesson: null, why: 'review' };
}

/** Items that can run as quick-fire review. */
export function reviewPool(lessons = allLessons().filter(isActive)) {
  const P = getProgress();
  const eligible = lessons.filter((l) => {
    const k = P.skills[l.skill];
    return l.kind === 'lesson' && (k?.masteredAt || l.inReview || (k?.attempts || 0) >= 6);
  });
  const use = eligible.length ? eligible : lessons.filter((l) => l.kind === 'lesson');
  const pool = [];
  for (const lesson of use)
    for (const act of lesson.activities)
      if (['code', 'sort', 'fill'].includes(act.type))
        for (const item of act.items) pool.push({ lesson, act, item });
  return pool;
}

export function sightWords(lessons = allLessons().filter(isActive)) {
  const out = [];
  for (const lesson of lessons)
    for (const act of lesson.activities)
      if (act.type === 'sightword') for (const item of act.items) out.push({ lesson, act, item });
  return out;
}
