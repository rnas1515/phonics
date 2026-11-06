// Game time: spend a token to open a short session, then play any of the games until the time is up.
import { h } from '../util.js';
import { speak, stopSpeaking } from '../tts.js';
import { btn, line, celebrate } from '../ui.js';
import { getSettings, currentProfileId } from '../store.js';
import { rewardStatus, spendToken, recordGame } from '../rewards.js';
import { checkBadges } from '../gamify.js';
import * as memory from './memory.js';
import * as sortrush from './sortrush.js';
import * as mystery from './mystery.js';

const GAMES = [memory, sortrush, mystery];
const KEY = () => 'wd.gameEnd.' + currentProfileId(); // each child has their own game session

const sessionEnd = () => { try { return Number(sessionStorage.getItem(KEY())) || 0; } catch { return 0; } };
const setSessionEnd = (t) => { try { sessionStorage.setItem(KEY(), String(t)); } catch { /* the session just will not survive a reload */ } };
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function gamesScreen(root) {
  let live = true;
  const timers = new Set(), intervals = new Map();
  const ctx = {
    later(fn, ms) { const id = setTimeout(() => { timers.delete(id); if (live) fn(); }, ms); timers.add(id); return id; },
    every(name, fn, ms) { ctx.clear(name); intervals.set(name, setInterval(() => live && fn(), ms)); },
    clear(name) { clearInterval(intervals.get(name)); intervals.delete(name); },
  };
  const total = getSettings().gameMinutes * 60000;
  const stage = h('div', { class: 'game-stage' });
  const clock = h('span', { class: 'chip' }, '');
  const fill = h('i', {});
  const strip = h('div', { class: 'game-clock' }, clock, h('div', { class: 'bar' }, fill));
  const timeUp = () => Date.now() >= sessionEnd();

  const frame = (...kids) => root.replaceChildren(h('div', { class: 'panel games' },
    h('div', { class: 'panel-head' }, h('h2', {}, '🎮 Game time'), h('a', { class: 'btn ghost', href: '#/' }, 'Back to HQ')),
    kids.length ? kids : null, stage));

  function tick() {
    const left = sessionEnd() - Date.now();
    clock.textContent = left > 0 ? `${fmt(left)} left` : "Time's up";
    fill.style.width = Math.max(0, Math.min(100, (left / total) * 100)) + '%';
  }

  function noTokens() {
    const r = rewardStatus();
    stage.replaceChildren(
      h('h3', {}, 'No games saved yet'),
      line(`Pass lessons to earn games. You are ${r.progress} of ${r.per} lessons from your next one.`),
      h('div', { class: 'bar' }, h('i', { style: `width:${Math.round((r.progress / r.per) * 100)}%` })),
      h('a', { class: 'btn primary', href: '#/' }, 'Back to HQ'));
    speak(`No games saved yet. You are ${r.progress} of ${r.per} lessons from your next one.`);
  }

  function offer() {
    const r = rewardStatus();
    const msg = `You have ${r.tokens} game${r.tokens === 1 ? '' : 's'} saved. Start one to play for ${getSettings().gameMinutes} minutes.`;
    stage.replaceChildren(
      h('h3', {}, 'Ready to play?'), line(msg),
      btn(`Start (uses 1 of ${r.tokens})`, { cls: 'primary xl', onClick: () => { if (spendToken()) { setSessionEnd(Date.now() + total); begin(); } } }),
      h('a', { class: 'btn ghost', href: '#/' }, 'Not now'));
    speak(msg);
  }

  function begin() {
    stage.replaceChildren();
    frame(strip);
    tick(); ctx.every('session', tick, 1000);
    picker();
  }

  function picker() {
    stage.replaceChildren(
      h('h3', {}, 'Pick a game'),
      h('div', { class: 'game-picker' }, GAMES.map((g) => h('button', { class: 'game-tile', type: 'button', onClick: () => run(g) },
        h('span', { class: 'game-emoji' }, g.info.emoji), h('strong', {}, g.info.title), h('span', {}, g.info.how)))));
    speak('Pick a game.');
  }

  async function run(g) {
    stopSpeaking();
    if (timeUp()) return over();
    stage.replaceChildren();
    const res = await g.play(stage, ctx);
    if (!live) return;
    recordGame(g.info.id, res.score);
    const fresh = checkBadges();
    celebrate();
    const msg = `${g.info.title}: ${res.label}. ${'⭐'.repeat(res.stars)}`;
    speak(`${res.label}. Great playing!`);
    const up = timeUp();
    stage.replaceChildren(
      h('h3', {}, up ? "Time's up! Great playing." : 'Nice game!'),
      h('div', { class: 'stars', 'aria-label': `${res.stars} stars` }, '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars)),
      line(msg),
      ...fresh.map((b) => h('div', { class: 'card badge-new' }, h('span', { class: 'badge-emoji' }, b.emoji), h('div', {}, h('strong', {}, 'New badge: ' + b.name), h('p', {}, b.how)))),
      h('div', { class: 'btn-row' },
        up ? h('a', { class: 'btn primary', href: '#/' }, 'Back to detective work')
           : [btn('Play again', { cls: 'primary', onClick: () => run(g) }), btn('Pick another game', { cls: 'ghost', onClick: picker }), h('a', { class: 'btn ghost', href: '#/' }, 'Back to HQ')]));
  }

  function over() {
    ctx.clear('session');
    stage.replaceChildren(
      h('h3', {}, "Time's up! Great playing."),
      line('That was your game time. Back to detective work when you are ready.'),
      h('a', { class: 'btn primary', href: '#/' }, 'Back to detective work'));
    speak("Time's up! Great playing. Back to detective work when you are ready.");
  }

  // entry: a running session continues; otherwise spend a token or explain how to earn one
  frame();
  if (!timeUp()) { frame(strip); tick(); ctx.every('session', tick, 1000); picker(); }
  else if (rewardStatus().tokens > 0) offer();
  else noTokens();

  return () => { live = false; timers.forEach(clearTimeout); intervals.forEach(clearInterval); stopSpeaking(); };
}
