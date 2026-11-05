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

/** Spell letters aloud: "ck" -> "C K" */
export const letters = (s) => [...String(s).toUpperCase()].join(' ');

export function stopSpeaking() {
  try { if (ttsSupported) speechSynthesis.cancel(); } catch { /* speech is optional */ }
}

/**
 * Speak text. Interrupts current speech unless opts.queue. Resolves when finished
 * (or straight away if muted / unsupported / the browser refuses), so it is always safe to ignore.
 * It never throws: a speech problem must not stop a lesson.
 */
export function speak(text, opts = {}) {
  if (!ttsSupported || !cfg.enabled || !text) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      if (!opts.queue) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate ?? cfg.rate;
      u.pitch = 1;
      const v = chooseVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      const t = setTimeout(resolve, Math.max(3000, text.length * 120)); // some engines never fire onend
      u.onend = u.onerror = () => { clearTimeout(t); resolve(); };
      speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}
