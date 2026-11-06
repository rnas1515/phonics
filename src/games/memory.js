// Memory Match: flip two cards to match a word with its coded version.
import { h, shuffle } from '../util.js';
import { speak } from '../tts.js';
import { renderCoded } from '../items.js';
import { codePairs } from './pool.js';

export const info = { id: 'memory', title: 'Memory Match', emoji: '🃏', how: 'Match each word with its coded twin.' };

export function play(host, ctx) {
  const pairs = codePairs(6);
  const cards = shuffle(pairs.flatMap((p) => [{ word: p.word, kind: 'word', p }, { word: p.word, kind: 'coded', p }]));
  let open = [], moves = 0, matched = 0, locked = false;
  const moveEl = h('span', { class: 'chip' }, 'Moves: 0');
  const els = cards.map((c, i) => {
    const face = h('div', { class: 'mem-face' });
    if (c.kind === 'word') face.append(h('span', { class: 'mem-word' }, c.word));
    else face.append(h('div', { class: 'mem-coded' }, renderCoded(c.p.parsed, { gaps: c.p.parsed.boundaries.size > 0 }).el));
    const b = h('button', { class: 'mem-card', type: 'button', 'aria-label': `Card ${i + 1}, face down`, onClick: () => flip(i) }, h('span', { class: 'mem-back' }, '?'), face);
    return b;
  });

  host.append(
    h('div', { class: 'game-bar' }, h('strong', {}, 'Find the pairs'), moveEl),
    h('p', { class: 'hintline' }, 'Tap two cards. A word matches its coded twin.'),
    h('div', { class: 'mem-grid' }, els));

  let resolve;
  const done = new Promise((r) => (resolve = r));

  function flip(i) {
    if (locked || els[i].classList.contains('up') || els[i].classList.contains('done')) return;
    els[i].classList.add('up');
    els[i].setAttribute('aria-label', `${cards[i].kind === 'word' ? 'Word' : 'Coded word'} ${cards[i].word}`);
    if (cards[i].kind === 'word') speak(cards[i].word);
    open.push(i);
    if (open.length < 2) return;
    moves++; moveEl.textContent = `Moves: ${moves}`;
    const [a, b] = open; open = [];
    if (cards[a].word === cards[b].word && cards[a].kind !== cards[b].kind) {
      [a, b].forEach((k) => { els[k].classList.add('done'); els[k].disabled = true; });
      speak(cards[a].word);
      if (++matched === pairs.length) ctx.later(() => resolve({ score: Math.max(0, 14 - moves), total: 12, stars: moves <= 10 ? 3 : moves <= 16 ? 2 : 1, label: `${moves} moves` }), 700);
    } else {
      locked = true;
      ctx.later(() => { [a, b].forEach((k) => els[k].classList.remove('up')); locked = false; }, 900);
    }
  }
  return done;
}
