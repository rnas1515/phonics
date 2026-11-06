// Local-only persistence (localStorage). Nothing leaves the device.
import { today } from './util.js';

const K = { progress: 'wd.progress.v1', settings: 'wd.settings.v1', custom: 'wd.customLessons.v1' };

function read(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* private mode / full: app still works for this visit */
  }
}

// Not security: just keeps a 2nd grader out of the tutor screen.
export function hashPin(pin) {
  let x = 5381;
  for (const c of `wd:${pin}`) x = ((x << 5) + x + c.charCodeAt(0)) | 0;
  return String(x);
}

const DEFAULT_SETTINGS = () => ({
  name: 'Marcelo',
  pin: hashPin('1234'),
  pinIsDefault: true,
  sessionMinutes: 15,
  lessonsPerGame: 5, // lessons passed for each game token
  maxTokens: 3, // tokens that can be banked
  gameMinutes: 5, // length of one game session
  tts: { enabled: true, rate: 0.9, voice: '' },
  active: {}, // lessonId -> boolean (unset = lesson.defaultActive)
});

// Words Marcelo missed on the graded ck/k worksheet start out as "trouble words" so review brings them back.
const SEED_TROUBLE = ['book', 'click', 'shook', 'cheek', 'struck', 'park', 'sunk'];

const DEFAULT_PROGRESS = () => ({
  skills: {}, // skillId -> {attempts, correct, lastSeen, masteredAt, passed:{}}
  words: Object.fromEntries(
    SEED_TROUBLE.map((w) => [w, { skill: 'ck-k', attempts: 1, correct: 0, wrong: 1, recent: [0], lastSeen: null, seeded: true }])
  ),
  sessions: [],
  checkpoints: [],
  reviews: 0,
  rewards: { counted: {}, progress: 0, tokens: 0, earned: 0, lost: 0 }, // game tokens: 1 per 5 lessons passed
  games: { sessions: 0, plays: {}, best: {} },
  placement: {}, // skillId -> {status:'secure'|'shaky'|'gap', score, date}
  points: 0,
  badges: {},
  streak: { last: null, count: 0, best: 0 },
});

let settings = { ...DEFAULT_SETTINGS(), ...read(K.settings, {}) };
let progress = { ...DEFAULT_PROGRESS(), ...read(K.progress, {}) };
let custom = read(K.custom, []);

export const getSettings = () => settings;
export const getProgress = () => progress;
export const getCustomLessons = () => custom;

const notify = () => window.dispatchEvent(new Event('wd:update'));

export function saveSettings() { write(K.settings, settings); notify(); }
export function saveProgress() { write(K.progress, progress); notify(); }
export function saveCustomLessons(list) { custom = list; write(K.custom, custom); }

export function checkPin(pin) { return hashPin(pin) === settings.pin; }
export function setPin(pin) { settings.pin = hashPin(pin); settings.pinIsDefault = false; saveSettings(); }

export function isActive(lesson) {
  const v = settings.active[lesson.id];
  return v === undefined ? lesson.defaultActive : v;
}
export function setActive(id, on) { settings.active[id] = on; saveSettings(); }

/* ---------- sessions ---------- */
let current = null;

function ensureSession() {
  const now = Date.now();
  if (current && now - current.lastAt > 30 * 60000) current = null; // 30 idle minutes = a new session
  if (!current) {
    current = { id: 's' + now, date: today(), start: now, lastAt: now, seconds: 0, items: 0, correct: 0, skills: [] };
    progress.sessions.push(current);
    if (progress.sessions.length > 300) progress.sessions.shift();
    const st = progress.streak;
    if (st.last !== today()) {
      const y = today(new Date(now - 864e5));
      st.count = st.last === y ? st.count + 1 : 1;
      st.last = today();
      st.best = Math.max(st.best, st.count);
    }
  }
  current.lastAt = now;
  current.seconds = Math.round((now - current.start) / 1000);
  return current;
}

export function sessionMinutes() {
  return current ? (Date.now() - current.start) / 60000 : 0;
}
export function todaySeconds() {
  return progress.sessions.filter((s) => s.date === today()).reduce((a, s) => a + (s.seconds || 0), 0);
}

/* ---------- recording ---------- */
export function recordItem({ skill, word, correct, dim = 'concept' }) {
  const s = ensureSession();
  s.items++;
  if (correct) s.correct++;
  if (!s.skills.includes(skill)) s.skills.push(skill);

  const k = (progress.skills[skill] ??= { attempts: 0, correct: 0, lastSeen: null, masteredAt: null, passed: {} });
  k.attempts++;
  if (correct) k.correct++;
  // Separate dimensions: coding, concept, reading (tutor-observed), reading-self (self-reported), comprehension.
  const dd = ((k.dims ??= {})[dim] ??= { attempts: 0, correct: 0 });
  dd.attempts++;
  if (correct) dd.correct++;
  k.lastSeen = new Date().toISOString();

  if (word) {
    const w = (progress.words[word] ??= { skill, attempts: 0, correct: 0, wrong: 0, recent: [], lastSeen: null });
    w.attempts++;
    if (correct) w.correct++; else w.wrong++;
    w.recent = [...w.recent.slice(-2), correct ? 1 : 0];
    w.lastSeen = new Date().toISOString();
    w.skill = skill;
  }
  if (correct) progress.points += 10;
  saveProgress();
  return correct ? 10 : 0;
}

/** Mark one activity as passed; the skill is mastered when every required activity has been. */
export function markPassed(lesson, actIndex) {
  const k = (progress.skills[lesson.skill] ??= { attempts: 0, correct: 0, lastSeen: null, masteredAt: null, passed: {} });
  k.passed[`${lesson.id}:${actIndex}`] = new Date().toISOString();
  const required = lesson.activities.map((a, i) => [a, i]).filter(([a]) => !a.optional);
  if (required.every(([, i]) => k.passed[`${lesson.id}:${i}`])) {
    if (k.placed) { k.placed = false; k.masteredAt = new Date().toISOString(); } // earned by practice, not just the check-up
    k.masteredAt ??= new Date().toISOString();
  }
  ensureSession();
  saveProgress();
}

/** Record a check-up result. Secure skills count as mastered (source: placement); gaps clear that. */
export function setPlacement(skill, status, score = null) {
  progress.placement[skill] = { status, score, date: today() };
  const k = (progress.skills[skill] ??= { attempts: 0, correct: 0, lastSeen: null, masteredAt: null, passed: {} });
  if (status === 'secure') { k.masteredAt ??= new Date().toISOString(); k.placed = true; }
  else if (k.placed) { k.masteredAt = null; k.placed = false; }
  ensureSession();
  saveProgress();
}
export function clearPlacement(skill) {
  delete progress.placement[skill];
  const k = progress.skills[skill];
  if (k?.placed) { k.masteredAt = null; k.placed = false; }
  saveProgress();
}

export function addBonus(points) { progress.points += points; saveProgress(); }

export function recordCheckpoint(entry) {
  progress.checkpoints.push({ date: today(), ...entry });
  saveProgress();
}

export function troubleWords() {
  return Object.entries(progress.words)
    .filter(([, w]) => w.wrong > 0 && !(w.recent.length >= 2 && w.recent.slice(-2).every(Boolean)))
    .map(([word, w]) => ({ word, ...w }))
    .sort((a, b) => b.wrong - a.wrong);
}

export function exportAll() {
  return JSON.stringify({ app: 'word-detective', version: 1, progress, settings, customLessons: custom }, null, 2);
}
export function importAll(text) {
  const d = JSON.parse(text);
  if (d.app !== 'word-detective') throw new Error('This is not a Word Detective backup file');
  progress = { ...DEFAULT_PROGRESS(), ...d.progress };
  settings = { ...DEFAULT_SETTINGS(), ...d.settings };
  custom = d.customLessons || [];
  write(K.progress, progress); write(K.settings, settings); write(K.custom, custom);
  notify();
}
/** Delete everything this app stored on this device (progress, settings, custom lessons). */
export function deleteAll() {
  for (const key of Object.values(K)) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
  progress = DEFAULT_PROGRESS();
  settings = DEFAULT_SETTINGS();
  custom = [];
  current = null;
  notify();
}
export function resetProgress() {
  progress = DEFAULT_PROGRESS();
  current = null;
  saveProgress();
}
