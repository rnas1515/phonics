// Mystery Word: hear the word, tap letters to reveal it. Unlimited tries; fewer misses = more stars.
import { h } from '../util.js';
import { speak } from '../tts.js';
import { speakBtn, btn } from '../ui.js';
import { mysteryWords } from './pool.js';

export const info = { id: 'mystery', title: 'Mystery Word', emoji: '🕵️', how: 'Hear the word, then tap the letters to find it.' };
const ALPHA = 'abcdefghijklmnopqrstuvwxyz'.split('');

export function play(host, ctx) {
  const words = mysteryWords(5);
  let wi = 0, stars = 0, misses = 0;
  const top = h('div', { class: 'game-bar' }, h('strong', {}, 'Mystery Word'), h('span', { class: 'chip' }, 'Word 1 of 5'));
  const slots = h('div', { class: 'word my-slots' });
  const hear = h('div', { class: 'row-center' });
  const keys = h('div', { class: 'my-keys' });
  const hint = h('p', { class: 'hintline', role: 'status' }, 'Tap a letter.');
  host.append(top, hear, slots, hint, keys);

  return new Promise((resolve) => {
    function round() {
      if (wi >= words.length) return resolve({ score: stars, total: words.length * 3, stars: stars >= 12 ? 3 : stars >= 8 ? 2 : 1, label: `${stars} stars` });
      const w = words[wi]; misses = 0;
      top.lastChild.textContent = `Word ${wi + 1} of ${words.length}`;
      hear.replaceChildren(speakBtn(w, 'Hear the word'), btn('💡 Hint', { cls: 'ghost', onClick: giveHint }));
      speak(w);
      const found = new Set();
      const slotEls = [...w].map(() => h('span', { class: 'slot' }, ''));
      slots.replaceChildren(...slotEls);
      const keyEls = ALPHA.map((c) => h('button', { class: 'btn key', type: 'button', 'data-k': c, onClick: () => pick(c) }, c));
      keys.replaceChildren(...keyEls);
      hint.textContent = `${w.length} letters. Tap a letter.`;
      function reveal(c) { [...w].forEach((ch, i) => { if (ch === c) slotEls[i].textContent = ch; }); found.add(c); }
      function done() { return [...new Set(w)].every((c) => found.has(c)); }
      function pick(c) {
        const k = keyEls[ALPHA.indexOf(c)]; if (k.disabled) return;
        k.disabled = true;
        if (w.includes(c)) { reveal(c); k.classList.add('right'); if (done()) win(); }
        else { misses++; k.classList.add('wrong'); hint.textContent = `No ${c} in this word. Try another letter.`; }
      }
      function giveHint() {
        const c = [...w].find((ch) => !found.has(ch)); if (!c) return;
        misses += 1; pick(c);
      }
      function win() {
        const s = misses <= 2 ? 3 : misses <= 5 ? 2 : 1; stars += s;
        keyEls.forEach((k) => (k.disabled = true));
        hint.textContent = `${w}! ${'⭐'.repeat(s)}`;
        speak(w); wi++;
        ctx.later(round, 1600);
      }
    }
    round();
  });
}
