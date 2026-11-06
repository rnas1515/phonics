// Offline copy + updates: when a new version is installed while the app is open, offer a one-tap update.
import { h } from './util.js';
import { btn } from './ui.js';

function showBanner() {
  if (document.querySelector('.update-banner')) return;
  const bar = h('div', { class: 'update-banner', role: 'status' },
    h('span', {}, '✨ A new version is ready.'),
    btn('Update', { cls: 'primary small', onClick: () => location.reload() }),
    btn('Later', { cls: 'ghost small', onClick: () => bar.remove() }));
  document.body.append(bar);
}

export function watchForUpdates() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  const hadController = !!navigator.serviceWorker.controller; // false on the very first visit: nothing to update from
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) showBanner(); });
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 60 * 60 * 1000);
  }).catch(() => {});
}
