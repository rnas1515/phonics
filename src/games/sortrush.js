// Sorting Rush: tap the right group for each word before the bar runs out. No penalty for a miss.
import { h, shuffle } from '../util.js';
import { speak } from '../tts.js';
import { speakBtn } from '../ui.js';
import { sortSets } from './pool.js';

export const info = { id: 'sortrush', title: 'Sorting Rush', emoji: '🏃', how: 'Sort the words into the right groups.' };
const N = 10, SECONDS = 9;

export function play(host, ctx) {
  const set = shuffle(sortSets())[0];
  const items = shuffle(set.items).slice(0, N);
  let i = 0, score = 0, streak = 0;
  const top = h('div', { class: 'game-bar' }, h('strong', {}, set.title), h('span', { class: 'chip' }, 'Score: 0'));
  const bar = h('div', { class: 'bar timer' }, h('i', {}));
  const card = h('div', { class: 'card-word' });
  const btns = h('div', { class: 'btn-row' });
  host.append(top, bar, card, btns, h('p', { class: 'hintline' }, 'A missed word just moves on. Keep going!'));

  return new Promise((resolve) => {
    function next() {
      if (i >= items.length) return resolve({ score, total: N, stars: score >= 9 ? 3 : score >= 6 ? 2 : 1, label: `${score} of ${N}` });
      const it = items[i];
      let answered = false, left = SECONDS;
      const spoken = it.word;
      card.replaceChildren(h('span', { class: 'big-word' + (it.shown.length > 9 ? ' phrase' : '') }, it.shown), speakBtn(spoken, 'Hear the word'));
      speak(spoken);
      const buttons = set.labels.map((l) => h('button', { class: 'btn cat', type: 'button' }, l));
      btns.replaceChildren(...buttons);
      const fill = bar.firstChild; fill.style.width = '100%';
      const finish = (ok, firstTry) => {
        if (answered) return; answered = true; ctx.clear('rush');
        buttons.forEach((b) => { b.disabled = true; if (b.textContent === it.answer) b.classList.add('right'); });
        if (ok && firstTry) { score++; streak++; } else streak = 0;
        top.lastChild.textContent = `Score: ${score}`;
        i++; ctx.later(next, ok ? 450 : 1100);
      };
      let missed = false;
      buttons.forEach((b) => b.addEventListener('click', () => {
        if (answered) return;
        if (b.textContent === it.answer) finish(true, !missed);
        else { missed = true; b.disabled = true; b.classList.add('wrong'); }
      }));
      ctx.every('rush', () => { left -= 0.25; fill.style.width = Math.max(0, (left / SECONDS) * 100) + '%'; if (left <= 0) finish(false, false); }, 250);
    }
    next();
  });
}
