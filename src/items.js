// Renderers: one practice item at a time. Each resolves { correct } (true only when right on the first try).
import { h, pick } from './util.js';
import { speak, stopSpeaking, letters } from './tts.js';
import { btn, speakBtn, line } from './ui.js';
import { parseCodedFull, gradeCoding, MARKS } from './coding.js';

const PRAISE = ['Nice detective work!', 'Case solved!', 'You got it!', 'Sharp eyes!', 'Exactly right!'];

const TOOL_LABEL = {
  breve: 'Short vowel', macron: 'Long vowel', strike: 'Cross out', underline: 'Underline', box: 'Box', divide: 'Divide',
};

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

/**
 * Static or interactive coded word. parsed = { letters, boundaries }.
 * onTap(i): a letter was tapped. onGap(p): the gap before letter p was tapped (syllable divider).
 */
export function renderCoded(parsed, { onTap, onGap, gaps = false } = {}) {
  const tiles = parsed.letters.map((p, i) =>
    h('button', { class: 'tile', type: 'button', 'aria-label': `letter ${p.ch}`, disabled: !onTap, onClick: onTap && (() => onTap(i)) }, h('span', { class: 'mk' }), h('span', { class: 'ch' }, p.ch))
  );
  const gapEls = new Map();
  const kids = [];
  tiles.forEach((t, i) => {
    if (i > 0 && gaps) {
      const g = h('button', { class: 'gap', type: 'button', 'aria-label': `divide between ${parsed.letters[i - 1].ch} and ${parsed.letters[i].ch}`, disabled: !onGap, onClick: onGap && (() => onGap(i)) });
      gapEls.set(i, g);
      kids.push(g);
    }
    kids.push(t);
  });
  const paint = (marks, bounds = new Set(), bad = new Set(), badBounds = new Set()) => {
    const has = (i, m) => marks[i] && [...marks[i]].includes(m);
    tiles.forEach((t, i) => {
      const cls = ['tile'];
      for (const m of marks[i] || []) cls.push('m-' + m);
      if (has(i, 'underline') && has(i + 1, 'underline')) cls.push('ul-next');
      if (has(i, 'underline') && has(i - 1, 'underline')) cls.push('ul-prev');
      if (has(i, 'box') && has(i + 1, 'box')) cls.push('bx-next');
      if (has(i, 'box') && has(i - 1, 'box')) cls.push('bx-prev');
      if (bad.has(i)) cls.push('bad');
      t.className = cls.join(' ');
    });
    gapEls.forEach((g, p) => { g.className = 'gap' + (bounds.has(p) ? ' on' : '') + (badBounds.has(p) ? ' bad' : ''); });
  };
  paint(parsed.letters.map((p) => p.marks), parsed.boundaries);
  return { el: h('div', { class: 'word', role: 'group' }, kids), paint, tiles };
}

/* ---------- code ---------- */
async function codeItem(host, act, item, ctx) {
  const tools = act.tools || MARKS;
  const markTools = tools.filter((t) => t !== 'divide');
  const exp = parseCodedFull(item.answer);
  const alts = (item.acceptAlso || []).map(parseCodedFull);
  const word = exp.letters.map((e) => e.ch).join('');
  const state = exp.letters.map(() => new Set());
  const bounds = new Set();
  let tool = null, attempts = 0, mistakes = 0, locked = false;

  const w = renderCoded({ letters: exp.letters.map((e) => ({ ch: e.ch, marks: [] })), boundaries: new Set() }, {
    gaps: tools.includes('divide'),
    onTap: (i) => {
      if (locked) return;
      if (!markTools.includes(tool)) {
        const m = 'First pick a tool. Then tap a letter.';
        speak(m); msg.textContent = m;
        toolRow.classList.add('nudge'); setTimeout(() => toolRow.classList.remove('nudge'), 700);
        return;
      }
      state[i].has(tool) ? state[i].delete(tool) : state[i].add(tool);
      w.paint(state, bounds);
    },
    onGap: (p) => {
      if (locked) return;
      bounds.has(p) ? bounds.delete(p) : bounds.add(p);
      tool = 'divide'; paintTools();
      w.paint(state, bounds);
    },
  });
  w.paint(state, bounds);

  const toolBtns = tools.map((t) =>
    h('button', { class: 'tool', type: 'button', 'data-tool': t, onClick: () => { tool = t; paintTools(); } }, h('span', { class: 'tool-glyph g-' + t }), h('span', { class: 'tool-label' }, TOOL_LABEL[t]))
  );
  const toolRow = h('div', { class: 'tools t' + tools.length, role: 'toolbar', 'aria-label': 'Coding tools' }, toolBtns);
  const paintTools = () => toolBtns.forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
  const only = tools.length === 1 ? tools[0] : null;
  if (only === 'divide') tool = 'divide';
  paintTools();
  const msg = h('p', { class: 'hintline', role: 'status' }, only === 'divide' ? 'Tap the space between two letters to put the line there.' : 'Pick a tool, then tap the letters.');
  const check = btn('Check ✔', { cls: 'primary', onClick: () => doCheck() });
  const clear = btn('Clear', { cls: 'ghost', onClick: () => { if (!locked) { state.forEach((x) => x.clear()); bounds.clear(); w.paint(state, bounds); } } });

  host.append(
    h('div', { class: 'word-head' }, h('span', { class: 'tag' }, 'Code this word'), speakBtn(word, 'Hear the word')),
    w.el, toolRow, msg, h('div', { class: 'btn-row' }, check, clear)
  );
  speak(word, { queue: true });

  let resolve;
  const done = new Promise((r) => (resolve = r));

  async function doCheck() {
    if (locked) return;
    const grades = [exp, ...alts].map((e) => gradeCoding(state, bounds, e.letters, e.boundaries, tools));
    const best = grades.find((g) => g.ok) || grades[0];
    if (best.ok) {
      locked = true; check.disabled = clear.disabled = true;
      const ok = mistakes === 0;
      await finish(host, ctx, { good: true, text: ok ? `${pick(PRAISE)} ${item.why}` : `You fixed it! ${item.why}`, spoken: ok ? pick(PRAISE) : 'You fixed it! Nice job.' });
      return resolve({ correct: ok });
    }
    mistakes++; attempts++;
    if (attempts >= 2) {
      locked = true; check.disabled = clear.disabled = true;
      exp.letters.forEach((e, i) => (state[i] = new Set(e.marks.filter((m) => markTools.includes(m)))));
      bounds.clear(); if (tools.includes('divide')) exp.boundaries.forEach((p) => bounds.add(p));
      w.paint(state, bounds);
      await finish(host, ctx, { good: false, text: `Here is the answer. ${item.why}`, spoken: 'Not quite. ' + item.why });
      return resolve({ correct: false });
    }
    w.paint(state, bounds, new Set(best.badLetters), new Set(best.badBounds));
    const text = best.badBounds.length && !best.badLetters.length ? 'Almost! Check where the line goes.' : 'Almost! Look at the orange letters and try again.';
    msg.textContent = text;
    speak(text);
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
