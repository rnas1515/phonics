import { h, shuffle } from './util.js';
import { speak, stopSpeaking } from './tts.js';
import { ask, line, celebrate, show } from './ui.js';
import { allLessons, reviewPool, sightWords } from './lessons.js';
import { playItems } from './play.js';
import { checkBadges } from './gamify.js';
import * as store from './store.js';

const dedupe = (entries) => {
  const seen = new Set();
  return entries.filter((e) => (seen.has(e.item.word + e.act.type) ? false : seen.add(e.item.word + e.act.type)));
};

/** Quick-fire mix: his trouble words first, then random items from skills he has worked on. */
export function buildReview(n = 10) {
  const active = allLessons().filter(store.isActive);
  const pool = reviewPool(active);
  const trouble = new Set(store.troubleWords().map((t) => t.word));
  const hard = shuffle(pool.filter((e) => trouble.has(e.item.word))).slice(0, 4);
  const rest = shuffle(pool.filter((e) => !hard.includes(e)));
  return shuffle(dedupe([...hard, ...rest]).slice(0, n));
}

export function reviewScreen(root) {
  let live = true;
  const alive = () => live;
  (async () => {
    const entries = buildReview();
    if (!entries.length) {
      return show(root, h('div', { class: 'panel' }, h('h2', {}, 'Nothing to review yet'), line('Finish a mission first, then come back for a review mix.'), h('a', { class: 'btn primary', href: '#/' }, 'Back to HQ')));
    }
    const before = store.getProgress().points;
    const r = await playItems(root, entries, { title: '🔁 Review mix', quick: true, alive, instruction: 'Quick-fire review! Do your best on each one.' });
    if (!r || !alive()) return;
    store.getProgress().reviews++;
    store.saveProgress();
    const fresh = checkBadges();
    celebrate();
    const msg = `You got ${r.correct} out of ${r.total}. You earned ${store.getProgress().points - before} points.`;
    speak(msg);
    const missed = r.results.filter((x) => !x.correct).map((x) => x.word);
    await ask(root, [
      h('h2', {}, 'Review complete'),
      h('div', { class: 'big-score' }, `${r.correct} / ${r.total}`),
      line(msg),
      missed.length ? h('p', { class: 'hintline' }, 'To look at again: ' + missed.join(', ')) : null,
      ...fresh.map((b) => h('div', { class: 'card badge-new' }, h('span', { class: 'badge-emoji' }, b.emoji), h('div', {}, h('strong', {}, 'New badge: ' + b.name), h('p', {}, b.how)))),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn ghost', href: '#/review' }, 'Another mix'), h('a', { class: 'btn primary', href: '#/' }, 'Back to HQ')),
    ], []);
  })().catch(console.error);
  return () => { live = false; stopSpeaking(); };
}

export function sightScreen(root) {
  let live = true;
  const alive = () => live;
  (async () => {
    const all = sightWords(allLessons().filter(store.isActive));
    if (!all.length) return show(root, h('div', { class: 'panel' }, h('h2', {}, 'No sight words are active'), h('a', { class: 'btn primary', href: '#/' }, 'Back to HQ')));
    // Words he needed help with come first.
    const trouble = new Set(store.troubleWords().map((t) => t.word));
    const ordered = [...shuffle(all.filter((e) => trouble.has(e.item.word))), ...shuffle(all.filter((e) => !trouble.has(e.item.word)))];
    const before = store.getProgress().points;
    const r = await playItems(root, ordered.slice(0, 10).map((e) => ({ ...e, act: { ...e.act, marking: 'self' } })), {
      title: '👁️ Sight words', alive, instruction: 'Read each word. Tap I read it, or tap Hear it if you need help.',
    });
    if (!r || !alive()) return;
    const fresh = checkBadges();
    celebrate();
    const help = r.results.filter((x) => !x.correct).map((x) => x.word);
    const msg = `You read ${r.correct} of ${r.total} on your own. You earned ${store.getProgress().points - before} points.`;
    speak(msg);
    await ask(root, [
      h('h2', {}, 'Sight words done'),
      h('div', { class: 'big-score' }, `${r.correct} / ${r.total}`),
      line(msg),
      help.length ? h('p', { class: 'hintline' }, 'Practice again: ' + help.join(', ')) : null,
      ...fresh.map((b) => h('div', { class: 'card badge-new' }, h('span', { class: 'badge-emoji' }, b.emoji), h('div', {}, h('strong', {}, 'New badge: ' + b.name)))),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn ghost', href: '#/sight' }, 'Again'), h('a', { class: 'btn primary', href: '#/' }, 'Back to HQ')),
    ], []);
  })().catch(console.error);
  return () => { live = false; stopSpeaking(); };
}
