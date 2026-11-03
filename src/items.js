// Renderers: one practice item at a time. Each resolves { correct } (true only when right on the first try).
import { h, pick } from './util.js';
import { speak, stopSpeaking, letters } from './tts.js';
import { btn, speakBtn, line } from './ui.js';
import { parseCoded, mismatches } from './coding.js';

const PRAISE = ['Nice detective work!', 'Case solved!', 'You got it!', 'Sharp eyes!', 'Exactly right!'];

const TOOLS = [
  { id: 'breve', label: 'Short vowel' },
  { id: 'macron', label: 'Long vowel' },
  { id: 'strike', label: 'Cross out' },
  { id: 'underline', label: 'Underline' },
];

export function runItem(host, act, item, ctx = {}) {
  host.replaceChildren();
  if (ctx.guided) tip(host, item);
  const fn = {
    code: codeItem,
    sort: sortItem,
    fill: act.oneLetter ? oneLetterItem : fillItem,
    sightword: sightItem,
    comprehension: compItem,
  }[act.type];
  return fn(host, act, item, ctx);
}

/* ---------- shared bits ---------- */
function tip(host, item) {
  host.append(h('div', { class: 'tip' }, h('strong', {}, '🕵️ Detective tip'), h('p', {}, item.why)));
  speak(item.why, { queue: true });
}

/** Show feedback + a Next button. Resolves when Next is pressed. */
function finish(host, ctx, { good, text, spoken }) {
  const fb = h('div', { class: 'feedback ' + (good ? 'good' : 'soft'), role: 'status' }, h('p', {}, text));
  const next = btn(ctx.last ? 'Finish ▶' : 'Next ▶', { cls: 'primary next' });
  host.append(fb, next);
  next.focus();
  speak(spoken ?? text);
  return new Promise((res) =>
    next.addEventListener('click', () => { stopSpeaking(); res(); }, { once: true })
  );
}

/** Static or interactive coded word. */
export function renderCoded(parsed, { onTap } = {}) {
  const tiles = parsed.map((p, i) => {
    const t = h('button', { class: 'tile', type: 'button', 'aria-label': `letter ${p.ch}`, disabled: !onTap, onClick: onTap && (() => onTap(i)) }, h('span', { class: 'mk' }), h('span', { class: 'ch' }, p.ch));
    return t;
  });
  const paint = (marks, bad = new Set()) => {
    tiles.forEach((t, i) => {
      const m = marks[i];
      const ul = m === 'underline';
      t.className =
        'tile' + (m ? ' m-' + m : '') + (ul && marks[i + 1] === 'underline' ? ' ul-next' : '') + (ul && marks[i - 1] === 'underline' ? ' ul-prev' : '') + (bad.has(i) ? ' bad' : '');
    });
  };
  paint(parsed.map((p) => p.marks[0] || null));
  return { el: h('div', { class: 'word', role: 'group' }, tiles), paint, tiles };
}

/* ---------- code ---------- */
async function codeItem(host, act, item, ctx) {
  const exp = parseCoded(item.answer);
  const word = exp.map((e) => e.ch).join('');
  const state = exp.map(() => null);
  let tool = null, attempts = 0, mistakes = 0, locked = false;

  const w = renderCoded(exp.map((e) => ({ ch: e.ch, marks: [] })), {
    onTap: (i) => {
      if (locked) return;
      if (!tool) { speak('First pick a tool. Then tap a letter.'); toolRow.classList.add('nudge'); setTimeout(() => toolRow.classList.remove('nudge'), 700); return; }
      state[i] = state[i] === tool ? null : tool;
      w.paint(state);
    },
  });
  w.paint(state);

  const toolBtns = TOOLS.map((t) =>
    h('button', { class: 'tool', type: 'button', 'data-tool': t.id, onClick: () => { tool = t.id; paintTools(); } }, h('span', { class: 'tool-glyph g-' + t.id }), h('span', { class: 'tool-label' }, t.label))
  );
  const toolRow = h('div', { class: 'tools', role: 'toolbar', 'aria-label': 'Coding tools' }, toolBtns);
  const paintTools = () => toolBtns.forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
  const msg = h('p', { class: 'hintline', role: 'status' }, 'Pick a tool, then tap the letters.');
  const check = btn('Check ✔', { cls: 'primary', onClick: () => doCheck() });
  const clear = btn('Clear', { cls: 'ghost', onClick: () => { if (!locked) { state.fill(null); w.paint(state); } } });

  host.append(
    h('div', { class: 'word-head' }, h('span', { class: 'tag' }, 'Code this word'), speakBtn(word, 'Hear the word')),
    w.el, toolRow, msg, h('div', { class: 'btn-row' }, check, clear)
  );
  speak(word, { queue: true });

  let resolve;
  const done = new Promise((r) => (resolve = r));

  async function doCheck() {
    if (locked) return;
    const bad = mismatches(state, exp);
    if (!bad.length) {
      locked = true; check.disabled = clear.disabled = true;
      const ok = mistakes === 0;
      await finish(host, ctx, { good: true, text: ok ? `${pick(PRAISE)} ${item.why}` : `You fixed it! ${item.why}`, spoken: ok ? pick(PRAISE) : 'You fixed it! Nice job.' });
      return resolve({ correct: ok });
    }
    mistakes++; attempts++;
    if (attempts >= 2) {
      locked = true; check.disabled = clear.disabled = true;
      exp.forEach((e, i) => (state[i] = e.marks[0] || null));
      w.paint(state);
      await finish(host, ctx, { good: false, text: `Here is the answer. ${item.why}`, spoken: 'Not quite. ' + item.why });
      return resolve({ correct: false });
    }
    w.paint(state, new Set(bad));
    msg.textContent = 'Almost! Look at the orange letters and try again.';
    speak('Almost! Look at the orange letters and try again.');
  }
  return done;
}

/* ---------- sort ---------- */
async function sortItem(host, act, item, ctx) {
  const cats = act.categories;
  host.append(
    h('div', { class: 'card-word' }, h('span', { class: 'big-word' }, item.word), speakBtn(item.word, 'Hear the word'))
  );
  const buttons = cats.map((c) => h('button', { class: 'btn cat', type: 'button', 'data-id': c.id }, c.label));
  host.append(h('div', { class: 'btn-row' }, buttons));
  speak(item.word, { queue: true });
  const id = await new Promise((res) => buttons.forEach((b) => b.addEventListener('click', () => res(b.dataset.id), { once: true })));
  buttons.forEach((b) => { b.disabled = true; if (b.dataset.id === item.answer) b.classList.add('right'); else if (b.dataset.id === id) b.classList.add('wrong'); });
  const ok = id === item.answer;
  await finish(host, ctx, ok ? { good: true, text: `${pick(PRAISE)} ${item.why}`, spoken: pick(PRAISE) } : { good: false, text: item.why, spoken: 'Not quite. ' + item.why });
  return { correct: ok };
}

/* ---------- fill (generic) ---------- */
async function fillItem(host, act, item, ctx) {
  host.append(
    h('div', { class: 'card-word' }, h('span', { class: 'big-word' }, item.pattern.replace(/_+/g, ' ＿＿ ')), speakBtn(item.word, 'Hear the word'))
  );
  const buttons = act.choices.map((c) => h('button', { class: 'btn cat', type: 'button', 'data-id': c }, c));
  host.append(h('div', { class: 'btn-row' }, buttons));
  speak(item.word, { queue: true });
  const id = await new Promise((res) => buttons.forEach((b) => b.addEventListener('click', () => res(b.dataset.id), { once: true })));
  buttons.forEach((b) => { b.disabled = true; if (b.dataset.id === item.answer) b.classList.add('right'); else if (b.dataset.id === id) b.classList.add('wrong'); });
  const ok = id === item.answer;
  await finish(host, ctx, ok ? { good: true, text: `${pick(PRAISE)} ${item.why}`, spoken: pick(PRAISE) } : { good: false, text: item.why, spoken: 'Not quite. ' + item.why });
  return { correct: ok };
}

/* ---------- the ck / k "ONE letter" game ---------- */
const KIND_SAYS = { short: 'a short vowel, all alone', consonant: 'a consonant', team: 'part of a vowel team' };

async function oneLetterItem(host, act, item, ctx) {
  const { word, stem, answer, before, beforeKind } = item;
  let mistakes = 0;
  const blank = h('span', { class: 'blank' }, '?');
  const tiles = [...stem].map((c, i) => h('button', { class: 'tile small', type: 'button', 'aria-label': `letter ${c}` }, h('span', { class: 'ch' }, c)));
  const wordEl = h('div', { class: 'word', role: 'group' }, tiles, blank);
  const prompt = h('div', { class: 'say big' });
  const area = h('div', { class: 'area' });
  const setPrompt = (text, interrupt = true) => {
    prompt.replaceChildren(h('p', {}, text), speakBtn(text));
    speak(text, { queue: !interrupt });
  };
  const rule = h('p', { class: 'rule-strip' }, h('b', {}, 'Short vowel alone'), ' → ck   ·   ', h('b', {}, 'Consonant or vowel team'), ' → k');
  host.append(
    h('div', { class: 'word-head' }, h('span', { class: 'tag' }, 'ck or k?'), speakBtn(word, 'Hear the word')),
    wordEl, prompt, area, rule
  );
  speak(word, { queue: true });

  const last = tiles[tiles.length - 1];
  const markTarget = () => {
    last.classList.add('target');
    if (beforeKind === 'team') tiles.slice(-2).forEach((t) => t.classList.add('team'));
  };

  if (!ctx.quick) {
    // Step 1: point at the ONE letter right before the k sound.
    setPrompt('Tap the ONE letter right before the k sound.', false);
    last.classList.add('pulse');
    await new Promise((res) =>
      tiles.forEach((t) =>
        t.addEventListener('click', () => {
          if (t === last) res();
          else { t.classList.add('shake'); setTimeout(() => t.classList.remove('shake'), 400); speak('Look at the ONE letter right before the blank.'); }
        })
      )
    );
    last.classList.remove('pulse');
    markTarget();

    // Step 2: what kind of letter is it?
    setPrompt(`That letter is "${before}". What is it?`);
    const kinds = act.kinds;
    const kb = kinds.map((k) => h('button', { class: 'btn cat', type: 'button', 'data-id': k.id }, k.label));
    area.replaceChildren(h('div', { class: 'btn-row' }, kb));
    await new Promise((res) =>
      kb.forEach((b) =>
        b.addEventListener('click', () => {
          if (b.dataset.id === beforeKind) { b.classList.add('right'); kb.forEach((x) => (x.disabled = true)); res(); }
          else {
            mistakes++; b.disabled = true; b.classList.add('wrong');
            speak(`Look again. The letter is "${before}". It is ${KIND_SAYS[beforeKind]}.`);
          }
        })
      )
    );
    speak(`Yes! "${before}" is ${KIND_SAYS[beforeKind]}.`);
  } else {
    // Quick-fire (review): go straight to the choice, hint on demand.
    const hint = btn('💡 Hint', { cls: 'ghost', onClick: () => { markTarget(); speak('Look at the ONE letter right before the k sound. Short vowel alone: c k. Consonant or vowel team: just k.'); } });
    area.append(hint);
  }

  // Step 3: choose the ending.
  setPrompt(ctx.quick ? 'Which ending: c k, or k?' : `So which ending does ${word} need?`, ctx.quick);
  const cb = act.choices.map((c) => h('button', { class: 'btn cat choice', type: 'button', 'data-id': c }, c));
  const choiceRow = h('div', { class: 'btn-row' }, cb);
  area.append(choiceRow);
  const ok = await new Promise((res) =>
    cb.forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.id === answer) { cb.forEach((x) => (x.disabled = true)); b.classList.add('right'); res(mistakes === 0); }
        else { mistakes++; b.disabled = true; b.classList.add('wrong'); speak('Not quite. ' + item.why); }
      })
    )
  );
  blank.textContent = answer;
  blank.classList.add('filled');
  markTarget();
  await finish(host, ctx, ok ? { good: true, text: `${pick(PRAISE)} ${item.why}`, spoken: `${pick(PRAISE)} ${word}.` } : { good: false, text: item.why, spoken: item.why });
  return { correct: ok };
}

/* ---------- sight words ---------- */
async function sightItem(host, act, item, ctx) {
  const tutor = act.marking === 'tutor';
  host.append(h('div', { class: 'flash' }, h('span', { class: 'flash-word' }, item.word)));
  const row = h('div', { class: 'btn-row' });
  host.append(row);

  if (tutor) {
    host.prepend(h('p', { class: 'hintline' }, 'Read the word out loud. Tutor: how did it go?'));
    const easy = btn('Easily ✔', { cls: 'primary' });
    const help = btn('Needed help', { cls: 'ghost' });
    row.append(easy, help);
    const ok = await new Promise((res) => { easy.onclick = () => res(true); help.onclick = () => res(false); });
    row.remove();
    await finish(host, ctx, { good: ok, text: ok ? 'Marked: easily.' : `Marked: needed help. The word is "${item.word}".`, spoken: ok ? 'Nice reading!' : `That word is ${item.word}.` });
    return { correct: ok };
  }

  let heard = false;
  const hear = btn('🔊 Hear it', { cls: 'ghost', onClick: () => { heard = true; speak(item.word); readBtn.textContent = 'I said it'; } });
  const readBtn = btn('✅ I read it!', { cls: 'primary' });
  row.append(readBtn, hear);
  speak('Read this word.', { queue: true });
  await new Promise((res) => readBtn.addEventListener('click', res, { once: true }));
  row.remove();
  await finish(
    host, ctx,
    heard
      ? { good: false, text: `Good listening! The word is "${item.word}". We will practice it again soon.`, spoken: `Good listening! ${item.word}.` }
      : { good: true, text: `${pick(PRAISE)} You read "${item.word}" by yourself.`, spoken: pick(PRAISE) }
  );
  return { correct: !heard };
}

/* ---------- comprehension ---------- */
async function compItem(host, act, item, ctx) {
  host.append(
    h('div', { class: 'passage' }, h('p', {}, item.passage), speakBtn(item.passage, 'Read the story aloud')),
    line(item.question, 'big')
  );
  const buttons = item.choices.map((c, i) => h('button', { class: 'btn cat', type: 'button', 'data-i': i }, c));
  host.append(h('div', { class: 'btn-col' }, buttons));
  speak(`${item.passage} ${item.question}`, { queue: true });
  const i = await new Promise((res) => buttons.forEach((b) => b.addEventListener('click', () => res(+b.dataset.i), { once: true })));
  buttons.forEach((b, j) => { b.disabled = true; if (j === item.answer) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); });
  const ok = i === item.answer;
  await finish(host, ctx, ok ? { good: true, text: `${pick(PRAISE)} ${item.why}`, spoken: pick(PRAISE) } : { good: false, text: `The answer is "${item.choices[item.answer]}". ${item.why}`, spoken: `Not quite. The answer is ${item.choices[item.answer]}.` });
  return { correct: ok };
}

export { letters };
