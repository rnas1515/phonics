// Tutor screens for sharing: "Share with a tutor" (owner) and the "Shared with me" tab (tutor).
import { h } from './util.js';
import { btn } from './ui.js';
import { listShares, addShare, removeShare, sharedWithMe } from './sharing.js';

export function shareSection(refresh) {
  const box = h('div', {}, h('h3', {}, 'Share progress with a tutor'),
    h('p', { class: 'hintline' }, 'A tutor you add here can see your children\'s progress (read-only) by signing in to their own account with this email. They cannot change anything.'));
  const msg = h('p', { class: 'hintline', role: 'status' });
  const list = h('div', {}, h('p', { class: 'hintline' }, 'Loading…'));
  const email = h('input', { type: 'email', placeholder: "Tutor's email", 'aria-label': "Tutor's email", autocomplete: 'off' });
  const paint = async () => {
    try {
      const rows = await listShares();
      list.replaceChildren(...(rows.length ? rows.map((r) => h('div', { class: 'profile-row' }, h('div', { class: 'grow' }, r.tutor_email),
        btn('Stop sharing', { cls: 'ghost small danger', onClick: async () => { await removeShare(r.tutor_email); paint(); } })))
        : [h('p', { class: 'hintline' }, 'Not shared with anyone.')]));
    } catch (e) { list.replaceChildren(h('p', { class: 'hintline' }, '⚠ ' + e.message)); }
  };
  paint();
  box.append(list, h('div', { class: 'form' }, email),
    h('div', { class: 'btn-row' }, btn('Share', { cls: 'primary', onClick: async () => {
      try { await addShare(email.value); email.value = ''; msg.textContent = 'Shared. They should sign in with that email (and confirm it).'; paint(); }
      catch (e) { msg.textContent = '⚠ ' + e.message; }
    } })), msg);
  return box;
}

export function sharedTab() {
  const body = h('div', {}, h('p', { class: 'hintline' }, 'Loading…'));
  sharedWithMe().then((kids) => {
    if (!kids.length) return body.replaceChildren(h('p', { class: 'hintline' }, 'Nobody has shared a child with this account yet. Ask the parent to add your email under Settings, Cloud account, Share progress with a tutor.'));
    body.replaceChildren(h('p', { class: 'hintline' }, 'Read-only. Updated whenever the family\'s device syncs.'), ...kids.map((k) => {
      const s = k.summary;
      return h('div', { class: 'card' },
        h('strong', {}, `${k.name} · grade ${k.grade}`),
        h('p', {}, `⭐ ${s.points} · 🏅 ${s.badges} badges · 🔥 ${s.streak} day streak`),
        h('p', {}, `${s.mastered} skills mastered of ${s.practiced} practiced${s.accuracy != null ? ` · ${s.accuracy}% right` : ''} · ${s.sessions} sessions${s.lastSession ? ` (last ${s.lastSession})` : ''}`),
        s.trouble.length ? h('p', { class: 'hintline' }, 'Trouble words: ' + s.trouble.map((w) => `${w.word} (${w.wrong})`).join(', ')) : null,
        h('p', { class: 'hintline' }, `Last synced ${new Date(k.updated).toLocaleString()}`));
    }));
  }).catch((e) => body.replaceChildren(h('p', { class: 'hintline' }, '⚠ ' + e.message)));
  return body;
}
