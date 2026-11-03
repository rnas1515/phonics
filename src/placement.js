// "Detective Check-up": find out what Marcelo already knows, early material first, then move on.
import { h } from './util.js';
import { speak, stopSpeaking } from './tts.js';
import { ask, line, celebrate } from './ui.js';
import { allLessons, checkable } from './lessons.js';
import { pickItems, playItems } from './play.js';
import * as store from './store.js';

const ITEMS_PER_SKILL = 4;
const SOFT_CAP_MIN = 12;

export const statusFor = (correct, total) => {
  const r = correct / total;
  return r >= 0.75 ? 'secure' : r >= 0.5 ? 'shaky' : 'gap';
};

const LABEL = { secure: '✔ Got it', shaky: '〰 Almost', gap: '🔍 To explore' };

export function checkupScreen(root) {
  let live = true;
  const alive = () => live;
  (async () => {
    const P = store.getProgress();
    const todo = checkable(allLessons().filter(store.isActive)).filter((l) => !P.placement[l.skill]);
    const intro = 'Show me what you already know. Nobody gets every one, and that is okay. I will use this to pick the best cases for you.';
    speak(intro);
    await ask(root, [h('h2', {}, '🕵️ Detective Check-up'), line(intro), h('p', { class: 'hintline' }, `${todo.length} skill${todo.length === 1 ? '' : 's'} to check. You can stop any time and come back.`)],
      [{ id: 'go', label: "Let's go!", cls: 'primary' }]);

    for (const lesson of todo) {
      const act = lesson.activities.find((a) => !a.optional && ['code', 'sort', 'fill'].includes(a.type));
      const items = pickItems(act, ITEMS_PER_SKILL);
      const r = await playItems(root, items.map((item) => ({ lesson, act, item })), {
        title: `🔍 ${lesson.title}`, quick: true, alive,
        instruction: `Clue about ${lesson.title}. Do your best.`,
      });
      if (!r || !alive()) return;
      store.setPlacement(lesson.skill, statusFor(r.correct, r.total), r.correct);
      if (store.sessionMinutes() >= SOFT_CAP_MIN && lesson !== todo[todo.length - 1]) {
        const msg = 'Great detective work! You can stop here and finish the check-up next time.';
        speak(msg);
        const c = await ask(root, [h('h2', {}, '⏰ Nice work so far'), line(msg)], [{ id: 'stop', label: 'Stop for today', cls: 'primary' }, { id: 'more', label: 'Keep going', cls: 'ghost' }]);
        if (c === 'stop') return summary(root);
      }
    }
    summary(root);
  })().catch(console.error);
  return () => { live = false; stopSpeaking(); };
}

function summary(root) {
  const P = store.getProgress();
  const rows = allLessons().filter((l) => P.placement[l.skill]).map((l) => [l, P.placement[l.skill]]);
  const left = checkable(allLessons().filter(store.isActive)).filter((l) => !P.placement[l.skill]).length;
  celebrate();
  const msg = left ? 'Good start! Here is what I found so far.' : 'Check-up done! I know where to start now.';
  speak(msg);
  return ask(root, [
    h('h2', {}, left ? 'Check-up paused' : 'Check-up complete'),
    line(msg),
    h('div', { class: 'cases' }, rows.map(([l, p]) => h('div', { class: 'case' }, h('strong', {}, l.title), h('span', { class: 'chip ' + (p.status === 'secure' ? 'done' : p.status === 'shaky' ? 'prog' : 'new') }, LABEL[p.status])))),
    h('div', { class: 'btn-row' }, h('a', { class: 'btn primary', href: '#/' }, 'Back to HQ')),
  ], []);
}
