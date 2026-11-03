import { h } from './util.js';
import { speak, stopSpeaking } from './tts.js';
import { show, ask, line, celebrate, tutorGate } from './ui.js';
import { getLesson } from './lessons.js';
import { pickItems, playItems } from './play.js';
import { renderCoded } from './items.js';
import { parseCoded } from './coding.js';
import { checkBadges, award } from './gamify.js';
import * as store from './store.js';

export function missionScreen(root, [id]) {
  const lesson = getLesson(id);
  let live = true;
  const alive = () => live;
  if (!lesson) {
    show(root, h('div', { class: 'panel' }, h('h2', {}, 'Case not found'), h('a', { class: 'btn primary', href: '#/' }, 'Back to HQ')));
    return;
  }
  runLesson(root, lesson, alive).catch((e) => console.error(e));
  return () => { live = false; stopSpeaking(); };
}

function trickBlock(lesson) {
  return h('div', { class: 'card trick' }, h('strong', {}, '🔎 The trick'), line(lesson.trickText));
}

async function introduce(root, lesson) {
  speak(lesson.say);
  const head = h('div', { class: 'panel-head' }, h('h2', {}, lesson.title), lesson.saxonLesson ? h('span', { class: 'chip' }, `Lesson ${lesson.saxonLesson}`) : null);
  for (;;) {
    const c = await ask(root, [head, line(lesson.say), trickBlock(lesson)], [
      ...(lesson.example ? [{ id: 'example', label: 'Show me an example' }] : []),
      { id: 'go', label: "I'm ready!", cls: 'primary' },
    ]);
    if (c === 'go') return;
    await showExample(root, lesson);
    speak(lesson.say);
  }
}

async function showExample(root, lesson) {
  const ex = lesson.example;
  const visual = lesson.activities[0].type === 'code' && ex.answer
    ? renderCoded(parseCoded(ex.answer)).el
    : h('div', { class: 'card-word' }, h('span', { class: 'big-word' }, ex.word), ex.answer ? h('span', { class: 'chip' }, ex.answer) : null);
  speak(ex.say || ex.word);
  await ask(root, [h('h2', {}, `Example: ${ex.word}`), visual, line(ex.say || '')], [{ id: 'ok', label: 'Got it', cls: 'primary' }]);
}

async function runSet(root, lesson, ai, alive) {
  const act = lesson.activities[ai];
  const { correct: need, of } = act.passRule;
  const title = `${lesson.title}${act.section ? ' · ' + act.section : ''}`;
  let tries = 0;
  for (;;) {
    const items = pickItems(act, of);
    const r = await playItems(root, items.map((item) => ({ lesson, act, item })), { title, alive });
    if (!r) return null;
    const passed = r.correct >= need;
    if (act.optional || passed || tries >= 2) return { ...r, passed, tries };
    tries++;
    // Mastery rule: not enough -> show the trick again, 2 guided words, then retry.
    await ask(root, [h('h2', {}, `You got ${r.correct} of ${r.total}`), line(`You need ${need} to move on. That's okay! Let's look at the trick again.`), trickBlock(lesson)], [{ id: 'ok', label: 'Show me 2 guided words', cls: 'primary' }]);
    const guided = pickItems(act, 2, items).map((item) => ({ lesson, act, item }));
    await playItems(root, guided, { title: title + ' · guided', guided: true, alive, instruction: 'Let us try these together. Read the tip first.' });
    if (!alive()) return null;
    await ask(root, [h('h2', {}, 'Ready to try again?'), line('Here is a fresh set. You can do it, detective!')], [{ id: 'go', label: 'Try again', cls: 'primary' }]);
  }
}

async function capNudge(root) {
  const cap = store.getSettings().sessionMinutes;
  if (store.sessionMinutes() < cap) return false;
  const msg = `You have practiced for ${Math.round(store.sessionMinutes())} minutes. Great work today! You can stop here, or keep going.`;
  speak(msg);
  const c = await ask(root, [h('h2', {}, '⏰ Time check'), line(msg)], [{ id: 'stop', label: "I'm done for today", cls: 'primary' }, { id: 'more', label: 'One more case', cls: 'ghost' }]);
  return c === 'stop';
}

async function runLesson(root, lesson, alive) {
  const before = store.getProgress().points;
  await introduce(root, lesson);
  const outcomes = [];
  let stopped = false;

  for (let ai = 0; ai < lesson.activities.length && !stopped; ai++) {
    const act = lesson.activities[ai];
    if (lesson.kind === 'checkpoint') {
      if (act.marking === 'tutor' && !(await tutorGate(root))) continue;
      const items = pickItems(act, act.passRule.of);
      const r = await playItems(root, items.map((item) => ({ lesson, act, item })), { title: `${lesson.title} · ${act.section || ''}`, alive });
      if (!r) return;
      outcomes.push({ act, ...r });
      continue;
    }
    const r = await runSet(root, lesson, ai, alive);
    if (!r || !alive()) return;
    outcomes.push({ act, ...r });
    if (r.passed && !act.optional) store.markPassed(lesson, ai);
    if (r.passed && r.correct === r.total) award('perfect');
    await ask(root, [h('h2', {}, r.passed ? '🎉 Case solved!' : 'Good effort, detective'), line(r.passed ? `You got ${r.correct} out of ${r.total}. On to the next part!` : `You got ${r.correct} out of ${r.total}. We will save this one for next time. Your tutor can help too.`)], [{ id: 'ok', label: ai === lesson.activities.length - 1 ? 'See my results' : 'Next case ▶', cls: 'primary' }]);
    if (r.passed) celebrate();
    if (ai < lesson.activities.length - 1 && (await capNudge(root))) stopped = true;
  }

  if (!alive()) return;
  if (lesson.kind === 'checkpoint') return checkpointResults(root, lesson, outcomes, before);

  const required = outcomes.filter((o) => !o.act.optional);
  const mastered = !!store.getProgress().skills[lesson.skill]?.masteredAt;
  const stars = required.length && required.every((o) => o.passed) ? (required.every((o) => o.correct === o.total) ? 3 : 2) : 1;
  const fresh = checkBadges();
  celebrate();
  const earned = store.getProgress().points - before;
  const summary = mastered ? `Skill mastered! You earned ${earned} points.` : `Nice work today. You earned ${earned} points.`;
  speak(summary);
  await ask(root, [
    h('h2', {}, mastered ? '🏆 Mastered!' : 'Mission report'),
    h('div', { class: 'stars', 'aria-label': `${stars} stars` }, '⭐'.repeat(stars) + '☆'.repeat(3 - stars)),
    line(summary),
    ...fresh.map((b) => h('div', { class: 'card badge-new' }, h('span', { class: 'badge-emoji' }, b.emoji), h('div', {}, h('strong', {}, 'New badge: ' + b.name), h('p', {}, b.how)))),
    h('div', { class: 'btn-row' }, h('a', { class: 'btn ghost', href: '#/review' }, 'Review mix'), h('a', { class: 'btn primary', href: '#/' }, 'Back to HQ')),
  ], []);
}

async function checkpointResults(root, lesson, outcomes, before) {
  const scored = outcomes.filter((o) => o.act.marking !== 'tutor');
  const score = scored.reduce((a, o) => a + o.correct, 0);
  const total = scored.reduce((a, o) => a + o.total, 0);
  const sight = outcomes.find((o) => o.act.marking === 'tutor');
  const band = (lesson.bands || []).slice().sort((a, b) => b.min - a.min).find((b) => score >= b.min);
  store.recordCheckpoint({ lessonId: lesson.id, score, total, band: band?.label || '', sight: sight ? `${sight.correct}/${sight.total}` : null });
  const fresh = checkBadges();
  celebrate();
  const msg = `You scored ${score} out of ${total}. ${band?.say || ''}`;
  speak(msg);
  await ask(root, [
    h('h2', {}, `Checkpoint: ${band?.label || 'Done'}`),
    h('div', { class: 'big-score' }, `${score} / ${total}`),
    line(msg),
    sight ? h('p', { class: 'hintline' }, `Sight words read easily: ${sight.correct} of ${sight.total}`) : null,
    ...fresh.map((b) => h('div', { class: 'card badge-new' }, h('span', { class: 'badge-emoji' }, b.emoji), h('div', {}, h('strong', {}, 'New badge: ' + b.name)))),
    h('p', { class: 'hintline' }, `Points earned: ${store.getProgress().points - before}`),
    h('a', { class: 'btn primary', href: '#/' }, 'Back to HQ'),
  ], []);
}
