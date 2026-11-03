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

/** Numeric PIN pad. Calls onOk() when the PIN is right. */
export function pinPad(onOk, hint = 'Enter the tutor PIN') {
  const input = h('input', { class: 'pin-input', type: 'password', inputmode: 'numeric', autocomplete: 'off', maxlength: 8, 'aria-label': 'PIN' });
  const msg = h('p', { class: 'pin-msg', role: 'status' }, hint);
  const submit = () => {
    if (checkPin(input.value)) onOk();
    else { msg.textContent = 'That PIN is not right.'; input.value = ''; input.focus(); }
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
  const key = (k) =>
    btn(k, {
      cls: 'key',
      onClick: () => {
        if (k === '⌫') input.value = input.value.slice(0, -1);
        else if (k === 'OK') submit();
        else input.value += k;
      },
    });
  return h('div', { class: 'pinpad' }, msg, input, h('div', { class: 'keys' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].map(key)));
}

/** Blocks until a grown-up enters the PIN (or the child skips). Resolves true/false. */
export function tutorGate(root, title = 'Hand this to your tutor') {
  return new Promise((resolve) => {
    const skip = btn('Skip this part', { cls: 'ghost', onClick: () => resolve(false) });
    show(root, h('div', { class: 'panel narrow' }, h('h2', {}, title), pinPad(() => resolve(true)), skip));
  });
}
