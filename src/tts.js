// Text-to-speech via the browser's Web Speech API (speechSynthesis). No speech recognition.
export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const cfg = { enabled: true, rate: 0.9, voice: '' };

export function configureTts(c = {}) {
  Object.assign(cfg, c);
  if (!cfg.enabled) stopSpeaking();
}
export const ttsEnabled = () => cfg.enabled;

export function listVoices() {
  if (!ttsSupported) return [];
  return speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
}

/**
 * How natural a voice is likely to sound (higher is better). Neural / "Natural" / "Premium" / "Enhanced" voices beat the
 * old robotic defaults; novelty and compact voices are ruled out. American English is preferred (US curriculum).
 */
export function scoreVoice(v) {
  const n = v.name || '';
  let s = 0;
  if (/natural|neural|online/i.test(n)) s += 50;
  if (/premium/i.test(n)) s += 45;
  if (/enhanced/i.test(n)) s += 35;
  if (/siri/i.test(n)) s += 30;
  if (/google/i.test(n)) s += 25;
  if (/samantha|ava|allison|zoe|nicky|aria|jenny|emma|ana\b|susan|evan|nathan/i.test(n)) s += 15;
  if (v.localService) s += 3; // works offline, a safe tie-breaker
  if (/^en[-_]US/i.test(v.lang)) s += 10;
  else if (/^en[-_](GB|AU|CA)/i.test(v.lang)) s += 4;
  if (/compact|espeak|eloquence|fred|zarvox|bad news|bells|whisper|boing|bubbles|cellos|trinoids|albert|junior|kathy|ralph|organ|good news|superstar|jester|hysterical|wobble/i.test(n)) s -= 100;
  return s;
}

/** English voices, best first. */
export function rankedVoices() {
  return listVoices().map((v) => [scoreVoice(v), v]).sort((a, b) => b[0] - a[0]).map(([, v]) => v);
}

function chooseVoice() {
  const ranked = rankedVoices();
  if (!ranked.length) return null;
  return ranked.find((v) => v.name === cfg.voice) || ranked[0];
}

/** Name of the voice that will be used, for the tutor settings screen. */
export const currentVoiceName = () => (ttsSupported ? chooseVoice()?.name || 'the browser default voice' : 'none (speech is not supported here)');

/**
 * Browsers load their voice list a moment after the page opens. Speaking before then would use the plain default
 * (robotic) voice, so wait for the list (up to ~1.2 s) before the first utterance.
 */
let ready = null;
function voicesReady() {
  if (!ttsSupported || speechSynthesis.getVoices().length) return Promise.resolve();
  ready ??= new Promise((resolve) => {
    speechSynthesis.addEventListener?.('voiceschanged', () => resolve(), { once: true });
    setTimeout(resolve, 1200);
  });
  return ready;
}

/**
 * Long passages make online voices cut out or fall back to a basic voice, so speak sentence-sized pieces
 * (each at most `max` characters), which also gives natural pauses.
 */
export function splitSpeech(text, max = 140) {
  const out = [];
  const sentences = String(text).replace(/\s+/g, ' ').trim().match(/[^.!?]+(?:[.!?]+|$)\s*/g) || [];
  for (const raw of sentences) {
    let rest = raw.trim();
    while (rest.length > max) {
      let cut = Math.max(rest.lastIndexOf(', ', max), rest.lastIndexOf('; ', max), rest.lastIndexOf(': ', max));
      if (cut < 40) cut = rest.lastIndexOf(' ', max);
      if (cut < 1) cut = max;
      out.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) out.push(rest);
  }
  return out.filter(Boolean);
}

/** Spell letters aloud: "ck" -> "C K" */
export const letters = (s) => [...String(s).toUpperCase()].join(' ');

let gen = 0; // bumps whenever speech is interrupted, so lines waiting for the voice list are dropped

export function stopSpeaking() {
  gen++;
  try { if (ttsSupported) speechSynthesis.cancel(); } catch { /* speech is optional */ }
}

/**
 * Speak text. Interrupts current speech unless opts.queue. Resolves when finished
 * (or straight away if muted / unsupported / the browser refuses), so it is always safe to ignore.
 * It never throws: a speech problem must not stop a lesson.
 */
export function speak(text, opts = {}) {
  if (!ttsSupported || !cfg.enabled || !text) return Promise.resolve();
  const mine = opts.queue ? gen : ++gen;
  return voicesReady().then(() => new Promise((resolve) => {
    if (mine !== gen) return resolve(); // interrupted while waiting for the voice list
    try {
      if (!opts.queue) speechSynthesis.cancel();
      const v = chooseVoice(); // one voice for every piece
      const parts = splitSpeech(text);
      let left = parts.length;
      const t = setTimeout(resolve, Math.max(3000, text.length * 120)); // some engines never fire onend
      const piece = () => { if (--left <= 0) { clearTimeout(t); resolve(); } };
      for (const part of parts) {
        const u = new SpeechSynthesisUtterance(part);
        u.rate = opts.rate ?? cfg.rate;
        u.pitch = 1;
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
        u.onend = u.onerror = piece;
        speechSynthesis.speak(u);
      }
      if (!parts.length) { clearTimeout(t); resolve(); }
    } catch {
      resolve();
    }
  }));
}
