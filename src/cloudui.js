// Tutor Settings: sign in to the cloud account, sync now, sign out.
import { h } from './util.js';
import { btn } from './ui.js';
import { cloud } from './cloud.js';
import { shareSection } from './sharingui.js';
import { photoSyncOn, setPhotoSync, PHOTO_CONSENT, deleteCloudPhotos, syncPhotos } from './photosync.js';

export function cloudSection(refresh) {
  if (!cloud.configured) {
    return h('div', {}, h('h3', {}, 'Cloud account'),
      h('p', { class: 'hintline' }, 'Cloud sync is not set up on this copy of the app. Everything stays on this device. See docs/cloud.md to turn it on.'));
  }
  const msg = h('p', { class: 'hintline', role: 'status' });
  const s = cloud.state();
  if (cloud.signedIn()) {
    return h('div', {}, h('h3', {}, 'Cloud account'),
      h('p', {}, `Signed in as ${s.email || 'your account'}.`),
      h('p', { class: 'hintline' }, s.last ? `Last synced ${new Date(s.last).toLocaleString()}.` : 'Not synced yet.'),
      s.lastError ? h('p', { class: 'banner' }, 'Last sync problem: ' + s.lastError) : null,
      h('div', { class: 'btn-row' },
        btn('Sync now', { cls: 'primary', onClick: async () => { msg.textContent = 'Syncing…'; const r = await cloud.trySync(); msg.textContent = r ? `Synced: ${r.pulled} received, ${r.pushed} sent.` : 'Could not sync. Check the connection and try again.'; setTimeout(refresh, 1200); } }),
        btn('Sign out', { cls: 'ghost', onClick: async () => { await cloud.signOut(); refresh(); } })),
      h('p', { class: 'hintline' }, 'Signing out keeps everything on this device. Photos are never uploaded.'), msg,
      photoSection(refresh),
      shareSection(refresh));
  }
  const email = h('input', { type: 'email', placeholder: 'Email', autocomplete: 'email', 'aria-label': 'Email' });
  const pw = h('input', { type: 'password', placeholder: 'Password (8+ characters)', autocomplete: 'current-password', 'aria-label': 'Password' });
  const go = (fn) => async () => {
    msg.textContent = 'One moment…';
    try {
      const r = await fn(email.value.trim(), pw.value);
      if (r.needsConfirm) return (msg.textContent = 'Check your email to confirm the account, then sign in.');
      await cloud.trySync();
      refresh();
    } catch (e) { msg.textContent = '⚠ ' + e.message; }
  };
  return h('div', {}, h('h3', {}, 'Cloud account'),
    h('p', { class: 'hintline' }, "Sign in to back up progress and use it on other devices. This stores each child's first name, progress and added lessons in your private account. Assessment photos stay on this device."),
    h('div', { class: 'form' }, email, pw),
    h('div', { class: 'btn-row' }, btn('Sign in', { cls: 'primary', onClick: go(cloud.signIn) }), btn('Create account', { cls: 'ghost', onClick: go(cloud.signUp) })), msg);
}

function photoSection(refresh) {
  const msg = h('p', { class: 'hintline', role: 'status', 'aria-live': 'polite' });
  const panel = h('div', { class: 'card', hidden: true },
    h('strong', {}, 'Parent permission'),
    h('ul', {}, PHOTO_CONSENT.map((t) => h('li', {}, t))),
    h('div', { class: 'btn-row' },
      btn('I agree, turn it on', { cls: 'primary', onClick: async () => { setPhotoSync(true); msg.textContent = 'Uploading photos…'; panel.hidden = true; try { const r = await syncPhotos(); msg.textContent = `Photo sync is on. ${r.up} sent, ${r.down} received.`; } catch (e) { msg.textContent = '⚠ ' + e.message; } setTimeout(refresh, 1500); } }),
      btn('Cancel', { cls: 'ghost', onClick: () => { panel.hidden = true; } })));
  const on = photoSyncOn();
  return h('div', {}, h('h3', {}, 'Assessment photos in the cloud'),
    h('p', { class: 'hintline' }, on ? 'On: new assessment photos are stored in your private account and appear on your other devices.' : 'Off: photos stay on this device only.'),
    h('div', { class: 'btn-row' },
      on ? btn('Turn off', { cls: 'ghost', onClick: () => { setPhotoSync(false); refresh(); } }) : btn('Turn on…', { cls: 'ghost', onClick: () => { panel.hidden = false; } }),
      btn('Delete my photos from the cloud', { cls: 'ghost danger', onClick: async () => {
        if (!confirm('Delete every assessment photo stored in your cloud account? Copies on your devices stay.')) return;
        try { const n = await deleteCloudPhotos(); msg.textContent = `Deleted ${n} photo(s) from the cloud.`; } catch (e) { msg.textContent = '⚠ ' + e.message; }
      } })),
    panel, msg);
}
