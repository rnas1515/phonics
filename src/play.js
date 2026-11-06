// Shared "play a list of items" machinery used by missions, review and sight-word practice.
import { h, shuffle } from './util.js';
import { speak } from './tts.js';
import { show, line, dots } from './ui.js';
import { runItem } from './items.js';
import * as store from './store.js';

const dimOf = (act) =>
  ({ code: 'coding', sort: 'concept', fill: 'concept', comprehension: 'comprehension' }[act.type] ||
    (act.marking === 'tutor' ? 'reading' : 'reading-self'));

/**
 * Choose n items. For sort/fill sets, balance across answers (so a ck/k set is never all one kind),
 * then shuffle.
 */
export function pickItems(act, n, exclude = []) {
  let pool = act.items.filter((i) => !exclude.includes(i));
  if (pool.length < n) pool = [...act.items];
  const balanced = (act.type === 'fill' || act.type === 'sort') && pool.every((i) => typeof i.answer === 'string');
  if (!balanced) return shuffle(pool).slice(0, n);
  const groups = new Map();
  for (const it of shuffle(pool)) (groups.get(it.answer) ?? groups.set(it.answer, []).get(it.answer)).push(it);
  const lists = shuffle([...groups.values()]);
  const out = [];
  while (out.length < n && lists.some((l) => l.length)) for (const l of lists) if (l.length && out.length < n) out.push(l.shift());
  return shuffle(out);
}

/**
 * Play items one at a time in `root`.
 * entries: [{ lesson, act, item }]. opts: { title, guided, quick, instruction, alive }
 * Returns { correct, total, results } (or null if the user left the screen).
 */
export async function playItems(root, entries, opts = {}) {
  const alive = opts.alive || (() => true);
  const d = dots(entries.length);
  const top = h('div', { class: 'set-top' }, h('span', { class: 'set-title' }, opts.title || ''), d.el);
  const host = h('div', { class: 'item-host' });
  const first = entries[0];
  const instruction = opts.instruction ?? first?.act.instruction;
  show(root, top, instruction ? line(instruction) : null, host);
  if (instruction) speak(instruction);

  let correct = 0;
  const results = [];
  for (let i = 0; i < entries.length; i++) {
    const { lesson, act, item } = entries[i];
    d.current(i);
    const res = await runItem(host, act, item, { index: i, total: entries.length, last: i === entries.length - 1, guided: opts.guided, quick: opts.quick, lesson });
    if (!alive()) return null;
    d.mark(i, res.correct);
    results.push({ word: item.word, skill: lesson.skill, correct: res.correct });
    if (!opts.guided && !opts.practice) {
      store.recordItem({ skill: lesson.skill, word: item.word, correct: res.correct, dim: dimOf(act) });
      if (res.correct) correct++;
    }
  }
  return { correct, total: entries.length, results };
}
