import './style.css';
import { h } from './util.js';
import * as store from './store.js';
import { configureTts, speak, ttsSupported } from './tts.js';
import { homeScreen } from './home.js';
import { missionScreen } from './mission.js';
import { reviewScreen, sightScreen } from './review.js';
import { tutorScreen } from './tutor.js';
import { checkupScreen } from './placement.js';
import { labScreen } from './wordlab.js';
import { gamesScreen } from './games/index.js';
import { whoScreen, hasPicked, avatarEl } from './profiles.js';
import { privacyScreen } from './privacy.js';
import { startVoicePack } from './voicepack.js';
import { watchForUpdates } from './updates.js';
import { startAutoSync } from './cloud.js';
import './photosync.js';

configureTts(store.getSettings().tts);
startVoicePack();

const routes = { '': homeScreen, mission: missionScreen, review: reviewScreen, sight: sightScreen, checkup: checkupScreen, lab: labScreen, games: gamesScreen, who: whoScreen, tutor: tutorScreen, privacy: privacyScreen };

const app = h('main', { id: 'app', tabindex: '-1' });
const points = h('span', { class: 'pill' });
const who = h('a', { class: 'pill who-chip', href: '#/who', title: 'Change who is playing' });
const mute = h('button', { class: 'btn icon-btn', type: 'button', 'aria-label': 'Sound on or off', onClick: toggleMute });
const header = h('header', { class: 'top' },
  h('a', { class: 'brand', href: '#/' }, h('span', { 'aria-hidden': 'true' }, '🕵️'), ' Word Detective'),
  h('div', { class: 'top-right' }, who, points, ttsSupported ? mute : null));
document.body.append(header, app);

function refreshHeader() {
  const kids = store.getProfiles();
  who.hidden = kids.length < 2; // only worth showing when there is someone to switch to
  who.replaceChildren(avatarEl(store.currentProfile(), 22), ' ' + store.currentProfile().name);
  const s = store.getSettings();
  points.textContent = `⭐ ${store.getProgress().points}`;
  mute.textContent = s.tts.enabled ? '🔊' : '🔇';
  mute.setAttribute('aria-pressed', String(!s.tts.enabled));
}
function toggleMute() {
  const s = store.getSettings();
  s.tts.enabled = !s.tts.enabled;
  configureTts(s.tts);
  store.saveSettings();
  if (s.tts.enabled) speak('Sound on.');
}
window.addEventListener('wd:update', refreshHeader);

let cleanup = null;
function render() {
  if (typeof cleanup === 'function') cleanup();
  const [name = '', ...params] = location.hash.replace(/^#\/?/, '').split('/');
  const screen = routes[name] || homeScreen;
  app.className = 'screen-' + (routes[name] ? name || 'home' : 'home');
  cleanup = screen(app, params);
  window.scrollTo(0, 0);
  refreshHeader();
}
window.addEventListener('hashchange', render);
// With several children, each visit starts by asking who is playing.
if (store.getProfiles().length > 1 && !hasPicked() && !['#/who', '#/tutor'].includes(location.hash)) history.replaceState(null, '', '#/who');
render();

watchForUpdates();
startAutoSync();
