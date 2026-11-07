// Generate natural-sounding audio for the app's fixed speech and write public/voice/.
//   node scripts/make-voice.mjs --dry      count lines and characters and estimate the cost (no key needed)
//   OPENAI_API_KEY=... node scripts/make-voice.mjs   generate any missing files (safe to re-run)
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { collect } from './voice-corpus.mjs';

const MODEL = process.env.VOICE_MODEL || 'tts-1';
const VOICE = process.env.VOICE_NAME || 'nova';
const PRICE_PER_MILLION = { 'tts-1': 15, 'tts-1-hd': 30, 'gpt-4o-mini-tts': 12 }[MODEL] ?? 15; // US dollars; check current pricing
const lines = collect();
const chars = lines.reduce((n, l) => n + l.text.length, 0);
const dir = new URL('../public/voice/', import.meta.url);
const have = (l) => existsSync(new URL(`${l.key}.mp3`, dir));
const todo = lines.filter((t) => !have(t));
const todoChars = todo.reduce((n, l) => n + l.text.length, 0);
console.log(`${lines.length} lines, ${chars} characters in total; ${todo.length} still to generate (${todoChars} characters).`);
console.log(`Estimated cost with ${MODEL}: about $${((todoChars / 1e6) * PRICE_PER_MILLION).toFixed(2)} (verify current pricing).`);
if (process.argv.includes('--dry')) process.exit(0);

const key = process.env.OPENAI_API_KEY;
if (!key) { console.error('Set OPENAI_API_KEY to generate audio (or use --dry).'); process.exit(1); }
mkdirSync(dir, { recursive: true });
let done = 0, failed = 0;

async function one({ key: k, text }) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, response_format: 'mp3', speed: 0.95 }),
    });
    if (res.ok) { writeFileSync(new URL(`${k}.mp3`, dir), Buffer.from(await res.arrayBuffer())); return true; }
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500 * attempt)); continue; }
    console.error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return false;
  }
  return false;
}

const queue = [...todo];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const t = queue.shift();
    if (await one(t)) done++; else failed++;
    if ((done + failed) % 50 === 0) console.log(`${done + failed}/${todo.length}`);
  }
}));

// The manifest lists which lines have audio; the app reads it at start.
const present = {};
for (const l of lines) if (have(l)) present[l.key] = 1;
writeFileSync(new URL('manifest.json', dir), JSON.stringify({ model: MODEL, voice: VOICE, files: present }));
console.log(`Done: ${done} generated, ${failed} failed, ${Object.keys(present).length} lines have audio.`);
process.exit(failed ? 1 : 0);
