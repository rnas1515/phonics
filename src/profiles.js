// Several children on one device: avatars and the "Who's playing?" screen.
import { h } from './util.js';
import { speak } from './tts.js';
import avatarImg from './assets/avatar.png';
import * as store from './store.js';

export const AVATARS = ['🦊', '🐼', '🐯', '🦉', '🐸', '🦁', '🐙', '🦄', '🚀', '⭐'];

/** The picture for a profile: the cartoon (avatar "img") or an emoji. */
export function avatarEl(p, size = 64) {
  if (p.avatar === 'img') return h('img', { class: 'avatar-img', src: avatarImg, alt: '', width: size, height: size });
  return h('span', { class: 'avatar-emoji', style: `font-size:${Math.round(size * 0.62)}px`, 'aria-hidden': 'true' }, p.avatar);
}

const flag = 'wd.who';
export const hasPicked = () => { try { return !!sessionStorage.getItem(flag); } catch { return true; } };
const markPicked = () => { try { sessionStorage.setItem(flag, '1'); } catch { /* the picker may show again after a reload */ } };

export function whoScreen(root) {
  const cur = store.currentProfileId();
  const pick = (id) => { store.switchProfile(id); markPicked(); location.hash = '#/'; };
  root.replaceChildren(h('div', { class: 'panel who' },
    h('h2', {}, "Who's playing?"),
    h('div', { class: 'who-grid' }, store.getProfiles().map((p) =>
      h('button', { class: 'who-tile' + (p.id === cur ? ' me' : ''), type: 'button', onClick: () => pick(p.id) },
        h('span', { class: 'who-pic' }, avatarEl(p, 96)), h('strong', {}, p.name)))),
    store.getProfiles().length < 2 ? h('p', { class: 'hintline' }, 'A grown-up can add more children in the 🔒 Tutor area.') : null,
    h('p', { class: 'foot' }, h('a', { href: '#/tutor' }, '🔒 Tutor'))));
  speak("Who is playing?");
}
