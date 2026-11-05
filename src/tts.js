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

function chooseVoice() {
  const voices = listVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.name === cfg.voice) ||
    voices.find((v) => /en-US/i.test(v.lang) && /samantha|google us|aria|jenny|natural/i.test(v.name)) ||
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices[0]
  );
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
