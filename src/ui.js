import { h } from './util.js';
import { speak } from './tts.js';
import { checkPin } from './store.js';

export const show = (root, ...nodes) => root.replaceChildren(...nodes.flat(Infinity).filter(Boolean));

export function btn(label, { cls = '', onClick, disabled } = {}) {
  return h('button', { class: 'btn ' + cls, type: 'button', onClick, disabled }, label);
}

export function speakBtn(text, label = 'Read aloud') {
  return h('button', { class: 'btn icon-btn', type: 'button', 'aria-label': label, title: label, onClick: () => speak(text) }, '🔊');
}

/** A line of instruction: always visible as text, always available as audio. */
export function line(text, cls = '') {
  return h('div', { class: 'say ' + cls }, h('p', {}, text), speakBtn(text));
}

/** Row of buttons; resolves with the id of the one pressed. */
export function choose(options) {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  const el = h('div', { class: 'btn-row' }, options.map((o) => btn(o.label, { cls: o.cls || '', onClick: () => resolve(o.id) })));
  return { el, promise };
}

export function ask(root, nodes, options) {
  const { el, promise } = choose(options);
  show(root, h('div', { class: 'panel' }, nodes, el));
  el.querySelector('button')?.focus();
  return promise;
}

/** Progress dots for a set of items. */
export function dots(n) {
  const els = Array.from({ length: n }, () => h('span', { class: 'dot' }));
  return {
    el: h('div', { class: 'dots', 'aria-hidden': 'true' }, els),
    mark: (i, ok) => els[i]?.classList.add(ok ? 'ok' : 'miss'),
    current: (i) => els.forEach((e, j) => e.classList.toggle('now', j === i)),
  };
}

export function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  const sym = ['⭐', '🔍', '✨', '🎉', '🕵️'];
  for (let i = 0; i < 26; i++) {
    const s = h('span', {}, sym[i % sym.length]);
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDelay = Math.random() * 0.6 + 's';
    s.style.fontSize = 18 + Math.random() * 20 + 'px';
    box.append(s);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3200);
}

/** Numeric PIN pad. Calls onOk() when the PIN is right. The digits live in a variable (not in a text box), so phone keyboards and autofill cannot interfere. */
export function pinPad(onOk, hint = 'Enter the tutor PIN') {
  const MAX = 8;
  let value = '';
  const msg = h('p', { class: 'pin-msg', role: 'status' }, hint);
  const shown = h('div', { class: 'pin-input', role: 'img', 'aria-label': 'PIN digits entered: none' }, '\u00a0');
  const paint = () => {
    shown.textContent = value ? '\u25CF '.repeat(value.length).trim() : '\u00a0';
    shown.setAttribute('aria-label', `PIN digits entered: ${value.length}`);
  };
  const submit = () => {
    if (checkPin(value)) return onOk();
    msg.textContent = 'That PIN is not right.'; value = ''; paint();
  };
  const press = (k) => {
    if (k === 'Delete') value = value.slice(0, -1);
    else if (k === 'Clear') value = '';
    else if (k === 'OK') return submit();
    else if (value.length < MAX) value += k;
    paint();
  };
  const key = (k) => btn(k, { cls: 'key' + (k.length > 2 ? ' keyword' : ''), onClick: () => press(k) });
  const root = h('div', { class: 'pinpad', tabindex: 0 }, msg, shown, h('div', { class: 'keys' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Delete', '0', 'OK'].map(key)),
    h('div', { class: 'btn-row' }, btn('Clear', { cls: 'ghost small', onClick: () => press('Clear') })));
  // A real keyboard still works (computers, iPads with keyboards).
  root.addEventListener('keydown', (e) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('Delete');
    else if (e.key === 'Enter') press('OK');
  });
  return root;
}

/** Blocks until a grown-up enters the PIN (or the child skips). Resolves true/false. */
export function tutorGate(root, title = 'Hand this to your tutor') {
  return new Promise((resolve) => {
    const skip = btn('Skip this part', { cls: 'ghost', onClick: () => resolve(false) });
    show(root, h('div', { class: 'panel narrow' }, h('h2', {}, title), pinPad(() => resolve(true)), skip));
  });
}
