import { h, today } from './util.js';
import { speak } from './tts.js';
import { allLessons, suggestNext, isMastered, accuracy } from './lessons.js';
import { BADGES } from './gamify.js';
import * as store from './store.js';

function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
}

function status(lesson) {
  const k = store.getProgress().skills[lesson.skill];
  if (k?.masteredAt) return { text: 'Mastered ✔', cls: 'done' };
  if (k?.attempts) {
    const a = accuracy(lesson.skill);
    return { text: `In progress · ${Math.round(a * 100)}%`, cls: 'prog' };
  }
  return { text: 'New', cls: 'new' };
}

function liveStreak(st) {
  const y = today(new Date(Date.now() - 864e5));
  return st.last === today() || st.last === y ? st.count : 0;
}

export function homeScreen(root) {
  const S = store.getSettings();
  const P = store.getProgress();
  const lessons = allLessons().filter(store.isActive);
  const { lesson: next, why, started } = suggestNext(lessons);
  const mins = Math.round(store.todaySeconds() / 60);
  const cap = S.sessionMinutes;

  const hello = `${greeting()}, Detective ${S.name}!`;

  const mission = why === 'checkup'
    ? h('section', { class: 'card mission' },
        h('span', { class: 'tag' }, "Today's mission"),
        h('h2', {}, started ? 'Finish the Detective Check-up' : 'Detective Check-up'),
        h('p', {}, 'Show me what you already know! Quick clues, no pressure. Then I will pick the best cases for you.'),
        h('a', { class: 'btn primary xl', href: '#/checkup' }, started ? 'Keep going ▶' : "Let's start ▶"))
    : next
    ? h('section', { class: 'card mission' },
        h('span', { class: 'tag' }, why === 'checkpoint' ? "Today's mission · Checkpoint" : "Today's mission"),
        h('h2', {}, next.title),
        h('p', {}, next.rule),
        h('a', { class: 'btn primary xl', href: `#/mission/${next.id}`, onClick: () => speak('') }, 'Start the case ▶'))
    : h('section', { class: 'card mission' },
        h('span', { class: 'tag' }, "Today's mission"),
        h('h2', {}, 'All cases solved!'),
        h('p', {}, 'Try a review mix to keep your skills sharp.'),
        h('a', { class: 'btn primary xl', href: '#/review' }, 'Review mix ▶'));

  const earned = BADGES.filter((b) => P.badges[b.id]);
  const shelf = h('div', { class: 'shelf' }, BADGES.map((b) =>
    h('div', { class: 'badge ' + (P.badges[b.id] ? 'on' : 'off'), title: `${b.name}: ${b.how}` },
      h('span', { class: 'badge-emoji' }, P.badges[b.id] ? b.emoji : '❔'),
      h('span', { class: 'badge-name' }, P.badges[b.id] ? b.name : b.how))));

  root.replaceChildren(
    h('div', { class: 'home' },
      h('div', { class: 'hero' },
        h('div', { class: 'hero-art', 'aria-hidden': 'true' }, '🕵️'),
        h('div', {}, h('p', { class: 'eyebrow' }, 'Detective HQ'), h('h1', {}, hello))),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', {}, `🔥 ${liveStreak(P.streak)}`), h('span', {}, 'day streak')),
        h('div', { class: 'stat' }, h('b', {}, `⭐ ${P.points}`), h('span', {}, 'points')),
        h('div', { class: 'stat' }, h('b', {}, `🏅 ${earned.length}`), h('span', {}, 'badges')),
        h('div', { class: 'stat wide' }, h('b', {}, `${mins} / ${cap} min`), h('div', { class: 'bar' }, h('i', { style: `width:${Math.min(100, (mins / cap) * 100)}%` })), h('span', {}, 'today'))),
      mission,
      h('div', { class: 'grid2' },
        h('a', { class: 'btn big', href: '#/review' }, '🔁 Review mix'),
        h('a', { class: 'btn big', href: '#/sight' }, '👁️ Sight words')),
      h('a', { class: 'btn big wide-btn', href: '#/lab' }, '🔬 Word Lab: type a word, get coding help'),
      h('h3', {}, 'All cases'),
      h('div', { class: 'cases' }, lessons.map((l) => {
        const st = status(l);
        return h('a', { class: 'case', href: `#/mission/${l.id}` },
          h('strong', {}, l.title), h('span', { class: 'chip ' + st.cls }, st.text));
      })),
      h('h3', {}, 'Badges'), shelf,
      h('footer', { class: 'foot' }, h('a', { href: '#/tutor' }, '🔒 Tutor'))));
}
