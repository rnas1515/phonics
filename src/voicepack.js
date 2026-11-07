// Recorded voice: if a line has an audio file in ./voice/, play it; otherwise the caller uses the device voice.
import { sentencesOf, sentenceKey } from './voicehash.js';

let files = null; // { key: 1 } from voice/manifest.json, or {} when there is no recorded voice
let loading = null;
let current = null; // the audio element playing now
let tail = Promise.resolve(); // resolves when the last queued recorded line has finished

export function loadVoicePack() {
  loading ??= fetch('./voice/manifest.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => { files = m?.files || {}; })
    .catch(() => { files = {}; });
  return loading;
}
export const startVoicePack = () => { loadVoicePack(); };
export const hasVoicePack = () => !!files && Object.keys(files).length > 0;
/** A text can be played from recordings only if every one of its sentences has one. */
export const recordingKeys = (text) => {
  const keys = sentencesOf(text).map(sentenceKey);
  return keys.length && keys.every((k) => files?.[k]) ? keys : null;
};

export function stopPack() {
  try { current?.pause(); } catch { /* ignore */ }
  current = null;
  tail = Promise.resolve();
}

/** Resolves when queued recorded speech is finished (so the device voice does not talk over it). */
export const whenIdle = () => tail;

/**
 * Play the recorded line for this text. Resolves true when it played, false when there is none, the browser
 * refused, or `wanted()` says the line was interrupted while it waited its turn.
 */
export function playPack(text, { rate = 1, queue = false, wanted = () => true } = {}) {
  const playOne = (key) => new Promise((resolve, reject) => {
    const a = new Audio(`./voice/${key}.mp3`);
    a.playbackRate = Math.min(1.25, Math.max(0.75, rate));
    current = a;
    a.onended = resolve;
    a.onerror = () => reject(new Error('audio failed'));
    a.play().catch(reject); // iOS may refuse until the child has tapped something
  });
  const run = async () => {
    try {
      await loadVoicePack();
      const keys = recordingKeys(text);
      if (!keys || !wanted()) return false;
      for (const k of keys) { if (!wanted()) break; await playOne(k); }
      return true;
    } catch {
      return false;
    }
  };
  const p = (queue ? tail : Promise.resolve()).then(run);
  tail = p.then(() => {}, () => {});
  return p;
}
