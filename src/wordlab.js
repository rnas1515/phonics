// Word Lab: type any word, get suggested coding with a step-by-step explanation.
import { h } from './util.js';
import { speak, stopSpeaking } from './tts.js';
import { show, btn, speakBtn } from './ui.js';
import { renderCoded, runItem } from './items.js';
import { analyzeWord } from './analyze.js';

const parsedOf = (r) => ({ letters: r.letters.map((ch, i) => ({ ch, marks: r.marks[i] })), boundaries: r.bounds });
const toolsOf = (r) => {
  const t = new Set();
  r.marks.forEach((ms) => ms.forEach((m) => t.add(m)));
  if (r.bounds.size) t.add('divide');
  return [...t];
};

export function labScreen(root) {
  let live = true;
  const input = h('input', {
    class: 'lab-input', type: 'text', maxlength: 16, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false',
    placeholder: 'Type a word', 'aria-label': 'Word to code',
  });
  const msg = h('p', { class: 'hintline', role: 'status' });
  const out = h('div', { class: 'lab-out' });

  const go = () => {
    const word = input.value.trim().toLowerCase();
    if (!/^[a-z]{2,16}$/.test(word)) { msg.textContent = 'Type a word with 2 to 16 letters, no spaces or numbers.'; out.replaceChildren(); return; }
    msg.textContent = '';
    showResult(analyzeWord(word));
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && go());

  function showResult(r) {
    stopSpeaking();
    const kids = [];
    if (r.empty) {
      kids.push(h('div', { class: 'card' }, h('h2', {}, r.word), r.notes.length ? r.notes.map((n) => h('p', {}, n)) : h('p', {}, 'I do not have a coding rule to suggest for this word. It may be a sight word, or one the app does not cover yet. Ask your tutor.'),
        speakBtn(r.word, 'Hear the word')));
    } else {
      const w = renderCoded(parsedOf(r), { gaps: r.bounds.size > 0 });
      kids.push(
        h('div', { class: 'card' },
          h('div', { class: 'word-head' }, h('span', { class: 'tag' }, 'Suggested coding'), speakBtn(r.word, 'Hear the word')),
          w.el,
          h('p', { class: 'hintline' }, 'This is a best guess from the rules the app knows. If your school pages show something different, follow the school pages.')),
        h('h3', {}, 'Step by step'),
        h('ol', { class: 'lab-steps' }, r.steps.map((s) => h('li', {}, h('span', {}, s.text), speakBtn(s.text)))),
        h('div', { class: 'btn-row' },
          btn('▶ Watch it step by step', { cls: 'primary', onClick: () => watch(r) }),
          btn('✏️ Try it myself', { cls: 'ghost', onClick: () => tryIt(r) })));
      if (r.notes.length) kids.push(h('div', { class: 'card note' }, h('strong', {}, 'Good to know'), h('ul', {}, r.notes.map((n) => h('li', {}, n)))));
      kids.push(h('details', { class: 'for-tutors' }, h('summary', {}, 'For tutors: lesson-file notation'), h('code', {}, r.coded)));
    }
    out.replaceChildren(...kids);
    speak(r.empty ? '' : `Here is how I would code ${r.word}.`);
  }

  // Apply the suggested marks one step at a time, with narration.
  async function watch(r) {
    const blank = { letters: r.letters.map((ch) => ({ ch, marks: [] })), boundaries: new Set() };
    const w = renderCoded(blank, { gaps: r.bounds.size > 0 });
    const marks = r.letters.map(() => new Set());
    const bounds = new Set();
    const say = h('div', { class: 'say big' });
    const next = btn('Show me the first step ▶', { cls: 'primary' });
    const count = h('p', { class: 'hintline' }, `${r.steps.length} step${r.steps.length === 1 ? '' : 's'}`);
    out.replaceChildren(h('div', { class: 'card' }, h('h2', {}, `Watch: ${r.word}`), w.el, count, say, h('div', { class: 'btn-row' }, next)));
    speak(`Watch how I code ${r.word}.`);
    for (const [n, st] of r.steps.entries()) {
      await new Promise((res) => next.addEventListener('click', res, { once: true }));
      if (!live) return;
      st.marks.forEach(([i, m]) => marks[i].add(m));
      if (st.bound) bounds.add(st.bound);
      w.paint(marks, bounds);
      say.replaceChildren(h('p', {}, st.text));
      count.textContent = `Step ${n + 1} of ${r.steps.length}`;
      speak(st.text);
      next.textContent = n === r.steps.length - 1 ? 'Done' : 'Next step ▶';
    }
    await new Promise((res) => next.addEventListener('click', res, { once: true }));
    if (live) showResult(r);
  }

  // Practice the same word with the real coding tools, checked against the suggestion.
  async function tryIt(r) {
    const host = h('div', { class: 'item-host' });
    out.replaceChildren(h('div', { class: 'card' }, h('h2', {}, `Try it: ${r.word}`), h('p', { class: 'hintline' }, 'Pick a tool, tap the letters, then Check. It is checked against the suggestion above.'), host));
    const act = { type: 'code', tools: toolsOf(r), instruction: '' };
    const item = { word: r.word, answer: r.coded, why: r.steps.map((s) => s.text).join(' ') };
    await runItem(host, act, item, { last: true });
    if (live) showResult(r);
  }

  show(root,
    h('div', { class: 'panel lab' },
      h('div', { class: 'panel-head' }, h('h2', {}, '🔬 Word Lab'), h('a', { class: 'btn ghost', href: '#/' }, 'Back to HQ')),
      h('p', {}, 'Type any word. I will show how to code it and explain each step.'),
      h('div', { class: 'lab-row' }, input, btn('Show me ▶', { cls: 'primary', onClick: go })),
      msg, out));
  input.focus();
  return () => { live = false; stopSpeaking(); };
}
