import { h, download, slug } from './util.js';
import { speak, rankedVoices, scoreVoice, configureTts, currentVoiceName } from './tts.js';
import { pinPad, btn } from './ui.js';
import { allLessons, problems, accuracy, weekOf } from './lessons.js';
import { normalizeLesson, deriveCk } from './validate.js';
import { autoCode, parseCodedFull } from './coding.js';
import { renderCoded } from './items.js';
import * as store from './store.js';

let unlocked = false; // resets when the page reloads

export function tutorScreen(root) {
  if (!unlocked) {
    root.replaceChildren(h('div', { class: 'panel narrow' }, h('h2', {}, '🔒 Tutor area'),
      pinPad(() => { unlocked = true; tutorScreen(root); }),
      h('a', { class: 'btn ghost', href: '#/' }, 'Back to HQ')));
    return;
  }
  const tabs = {
    Progress: progressTab, 'Trouble words': troubleTab, Sessions: sessionsTab, Lessons: lessonsTab, Settings: settingsTab,
  };
  const body = h('div', { class: 'tab-body' });
  const bar = h('div', { class: 'tabs', role: 'tablist' });
  const open = (name) => {
    [...bar.children].forEach((b) => b.setAttribute('aria-selected', String(b.textContent === name)));
    body.replaceChildren(tabs[name](() => open(name)));
  };
  Object.keys(tabs).forEach((n) => bar.append(h('button', { class: 'tab', role: 'tab', type: 'button', onClick: () => open(n) }, n)));
  const warn = store.getSettings().pinIsDefault ? h('p', { class: 'banner' }, '⚠ The PIN is still the default (1234). Change it in Settings.') : null;
  root.replaceChildren(h('div', { class: 'tutor' },
    h('div', { class: 'panel-head' }, h('h2', {}, 'Tutor view'),
      h('div', {}, btn('Lock', { cls: 'ghost', onClick: () => { unlocked = false; tutorScreen(root); } }), h('a', { class: 'btn ghost', href: '#/' }, 'Back to HQ'))),
    warn, bar, body));
  open('Progress');
}

const dimPct = (k, d) => (k?.dims?.[d]?.attempts ? Math.round((k.dims[d].correct / k.dims[d].attempts) * 100) + '%' : 'unknown');
const pct = (x) => (x == null ? '–' : Math.round(x * 100) + '%');
const dateOf = (iso) => (iso ? new Date(iso).toLocaleDateString() : '–');
const table = (head, rows) =>
  h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, head.map((c) => h('th', {}, c)))), h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));

/* ---------- progress ---------- */
function placementSelect(l, refresh) {
  const cur = store.getProgress().placement[l.skill]?.status || '';
  const sel = h('select', { 'aria-label': `Check-up result for ${l.title}`, onChange: (e) => {
    const v = e.target.value;
    if (!v) store.clearPlacement(l.skill); else store.setPlacement(l.skill, v);
    refresh();
  } }, [['', 'Not checked'], ['secure', 'Secure'], ['shaky', 'Almost'], ['gap', 'Gap']].map(([v, t]) => h('option', { value: v, selected: v === cur }, t)));
  return sel;
}

function progressTab(refresh) {
  const P = store.getProgress();
  const lessons = allLessons();
  const rows = lessons.map((l) => {
    const k = P.skills[l.skill];
    return [
      h('strong', {}, l.title), l.kind === 'checkpoint' ? 'Checkpoint' : l.saxonLesson ? `L${l.saxonLesson}` : '–',
      k?.attempts ?? 0, pct(accuracy(l.skill)),
      dimPct(k, 'coding'), dimPct(k, 'concept'), dimPct(k, 'reading'), dimPct(k, 'reading-self'), dateOf(k?.lastSeen),
      k?.masteredAt ? `✔ ${dateOf(k.masteredAt)}` : k?.attempts ? 'In progress' : 'Not started',
      store.isActive(l) ? 'Active' : 'Off',
      l.kind === 'lesson' ? placementSelect(l, refresh) : '–',
    ];
  });
  const cps = P.checkpoints.slice(-5).reverse().map((c) => [c.date, c.lessonId, `${c.score}/${c.total}`, c.band, c.sight || '–']);
  return h('div', {},
    h('p', { class: 'hintline' }, `Points ${P.points} · Streak ${P.streak.count} day(s) (best ${P.streak.best}) · Badges ${Object.keys(P.badges).length}`),
    table(['Skill', 'Saxon', 'Attempts', 'Accuracy', 'Coding', 'Concept', 'Reading (tutor)', 'Reading (self)', 'Last seen', 'Mastery', 'This week', 'Check-up'], rows),
    cps.length ? [h('h3', {}, 'Recent checkpoints'), table(['Date', 'Checkpoint', 'Score', 'Band', 'Sight words'], cps)] : null);
}

function troubleTab() {
  const t = store.troubleWords();
  if (!t.length) return h('p', {}, 'No trouble words right now. 🎉');
  return h('div', {},
    h('p', { class: 'hintline' }, 'A word leaves this list after two correct answers in a row. Words from the graded worksheet start here.'),
    table(['Word', 'Skill', 'Misses', 'Attempts', 'Last seen'], t.map((w) => [h('strong', {}, w.word), w.skill, w.wrong, w.attempts, w.seeded && !w.lastSeen ? 'worksheet' : dateOf(w.lastSeen)])));
}

function sessionsTab() {
  const S = store.getProgress().sessions.slice().reverse();
  if (!S.length) return h('p', {}, 'No sessions yet.');
  return table(['Date', 'Minutes', 'Items', 'Correct', 'Skills'], S.map((s) => [s.date, Math.max(1, Math.round(s.seconds / 60)), s.items, s.items ? Math.round((s.correct / s.items) * 100) + '%' : '–', s.skills.join(', ')]));
}

/* ---------- lessons ---------- */
function lessonsTab(refresh) {
  const lessons = allLessons();
  const rows = lessons.map((l) => {
    const cb = h('input', { type: 'checkbox', 'aria-label': `Active: ${l.title}`, checked: store.isActive(l), onChange: (e) => store.setActive(l.id, e.target.checked) });
    const acts = btn('Export', { cls: 'ghost small', onClick: () => download(`${l.id}.json`, JSON.stringify(strip(l), null, 2)) });
    const del = l.source === 'custom' ? btn('Delete', { cls: 'ghost small', onClick: () => { if (confirm(`Delete "${l.title}"?`)) { store.saveCustomLessons(store.getCustomLessons().filter((r) => r.id !== l.id)); refresh(); } } }) : null;
    const wk = weekOf(l);
    return [cb, h('strong', {}, l.title), wk ? new Date(wk.date + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '–', l.source, l.saxonLesson ?? '–', l.activities.map((a) => a.type).join(', '), h('span', {}, acts, del)];
  });
  const file = h('input', { type: 'file', accept: '.json,application/json', onChange: async (e) => {
    try {
      const raw = JSON.parse(await e.target.files[0].text());
      saveCustom(raw); refresh();
    } catch (err) { alert('Could not add that file: ' + err.message); }
  } });
  return h('div', {},
    h('p', { class: 'hintline' }, 'Tick the skills that are active this week (from the newsletter). Inactive skills are hidden from Marcelo. Lessons from files in /lessons are built in; lessons added here are saved on this device.'),
    table(['Active', 'Lesson', 'School week', 'Source', 'Saxon #', 'Activities', ''], rows),
    problems.length ? h('div', { class: 'banner' }, h('strong', {}, 'Some lessons have problems:'), problems.map((p) => h('p', {}, `${p.name}: ${p.errors.join('; ')}`))) : null,
    h('h3', {}, 'Add a lesson'),
    addForm(refresh),
    h('h3', {}, 'Import a lesson file'), h('label', { class: 'file' }, 'Choose a .json lesson file ', file));
}

function strip(l) {
  const { source, ...rest } = l; // exported file stays valid input
  return rest;
}

function saveCustom(raw) {
  const { lesson, errors } = normalizeLesson(raw, 'custom');
  if (!lesson) throw new Error(errors.join('; '));
  if (allLessons().some((l) => l.id === raw.id)) throw new Error(`A lesson with id "${raw.id}" already exists`);
  store.saveCustomLessons([...store.getCustomLessons(), raw]);
}

const words = (t) => t.split(/[\s,]+/).map((w) => w.trim().toLowerCase()).filter(Boolean);

function addForm(refresh) {
  const f = {};
  const field = (key, label, el) => { f[key] = el; return h('label', { class: 'field' }, h('span', {}, label), el); };
  const text = (ph = '') => h('input', { type: 'text', placeholder: ph });
  const area = (ph = '', rows = 3) => h('textarea', { rows, placeholder: ph });

  const typeSel = h('select', {}, [['code', 'Coding (mark the word)'], ['ckk', 'ck or k (one-letter game)'], ['sort', 'Sort into two groups'], ['sightword', 'Sight words']].map(([v, l]) => h('option', { value: v }, l)));
  const wordsArea = area('cake\nfive\nsmile', 5);
  const catA = text('Group A name, e.g. Sneaky e'); const catB = text('Group B name, e.g. Short vowel');
  const wordsB = area('Words for group B', 3);
  const preview = h('div', { class: 'preview' });
  const raw = h('textarea', { rows: 12, spellcheck: 'false', class: 'mono' });
  const msg = h('p', { class: 'hintline', role: 'status' });
  let dirty = false;
  raw.addEventListener('input', () => (dirty = true));

  const sortHint = h('div', { class: 'sort-fields' }, catA, wordsB, catB);

  function build() {
    const title = f.title.value.trim() || 'New lesson';
    const id = slug(title) || 'new-lesson';
    const t = typeSel.value;
    let act;
    const ws = words(wordsArea.value);
    if (t === 'code') act = { type: 'code', items: ws.map((w) => ({ word: w })) };
    else if (t === 'ckk') act = { type: 'fill', oneLetter: true, choices: ['ck', 'k'], items: ws.filter(deriveCk).map((w) => ({ word: w })) };
    else if (t === 'sightword') act = { type: 'sightword', items: ws.map((w) => ({ word: w })) };
    else {
      const a = slug(catA.value) || 'a', b = slug(catB.value) || 'b';
      act = { type: 'sort', categories: [{ id: a, label: catA.value || 'Group A' }, { id: b, label: catB.value || 'Group B' }],
        items: [...ws.map((w) => ({ word: w, answer: a })), ...words(wordsB.value).map((w) => ({ word: w, answer: b }))] };
    }
    const sax = parseInt(f.sax.value, 10);
    return { id, title, saxonLesson: Number.isInteger(sax) ? sax : null, skill: f.skill.value.trim() || id, priority: 6,
      rule: f.rule.value.trim(), trickText: f.trick.value.trim() || f.rule.value.trim(), say: f.say.value.trim() || undefined, activities: [act] };
  }

  function update() {
    sortHint.style.display = typeSel.value === 'sort' ? '' : 'none';
    wordsArea.placeholder = typeSel.value === 'sort' ? 'Words for group A' : 'one word per line';
    let lesson;
    try { lesson = build(); } catch (e) { msg.textContent = e.message; return; }
    if (!dirty) raw.value = JSON.stringify(JSON.parse(JSON.stringify(lesson)), null, 2);
    // Preview the coding so the tutor can check it (auto-coding is a best guess).
    preview.replaceChildren();
    if (typeSel.value === 'code')
      for (const w of words(wordsArea.value).slice(0, 12)) {
        try { preview.append(h('div', { class: 'pv' }, renderCoded(parseCodedFull(autoCode(w))).el)); } catch { /* ignore */ }
      }
  }

  const save = btn('Save lesson', { cls: 'primary', onClick: () => {
    try { saveCustom(JSON.parse(raw.value)); msg.textContent = 'Saved ✔'; refresh(); } catch (e) { msg.textContent = '⚠ ' + e.message; }
  } });
  const reset = btn('Rebuild from form', { cls: 'ghost', onClick: () => { dirty = false; update(); } });

  const form = h('div', { class: 'form', onInput: update, onChange: update },
    field('title', 'Lesson title', text('e.g. The ai Team')),
    field('skill', 'Skill id (letters, no spaces; leave blank to use the title)', text('ai-team')),
    field('sax', 'Saxon lesson number (leave blank if unknown)', text('61')),
    field('rule', 'The rule (one or two sentences)', area('', 2)),
    field('trick', 'The trick (what to do), spoken when he misses', area('', 2)),
    field('say', 'Spoken intro (optional)', area('', 2)),
    h('label', { class: 'field' }, h('span', {}, 'Activity'), typeSel),
    h('label', { class: 'field' }, h('span', {}, 'Words'), wordsArea), sortHint, preview,
    h('p', { class: 'hintline' }, 'Coding is auto-guessed (sneaky e, short vowels, letter teams). Check the preview. To override a word, edit the JSON below: "answer": "c a- k e/".'),
    h('label', { class: 'field' }, h('span', {}, 'Lesson file (JSON). Edit it directly for anything the form cannot do.'), raw),
    h('div', { class: 'btn-row' }, save, reset), msg);
  update();
  return form;
}

/* ---------- settings ---------- */
function settingsTab(refresh) {
  const S = store.getSettings();
  const name = h('input', { type: 'text', value: S.name });
  const cap = h('input', { type: 'number', min: 5, max: 60, value: S.sessionMinutes });
  const rate = h('input', { type: 'range', min: 0.6, max: 1.2, step: 0.05, value: S.tts.rate });
  const voices = rankedVoices();
  const voice = h('select', {}, h('option', { value: '' }, 'Automatic (best available)'),
    voices.map((v, i) => h('option', { value: v.name, selected: v.name === S.tts.voice }, `${i < 3 && scoreVoice(v) > 10 ? '★ ' : ''}${v.name} (${v.lang})`)));
  const apply = () => {
    S.name = name.value.trim() || 'Marcelo';
    S.sessionMinutes = Math.min(60, Math.max(5, +cap.value || 15));
    S.tts.rate = +rate.value; S.tts.voice = voice.value;
    configureTts(S.tts); store.saveSettings();
  };
  const msg = h('p', { class: 'hintline', role: 'status' });
  const p1 = h('input', { type: 'password', inputmode: 'numeric', placeholder: 'New PIN (4–8 digits)', maxlength: 8 });
  const setPin = btn('Change PIN', { cls: 'ghost', onClick: () => {
    if (!/^\d{4,8}$/.test(p1.value)) return (msg.textContent = 'PIN must be 4 to 8 digits.');
    store.setPin(p1.value); p1.value = ''; msg.textContent = 'PIN changed ✔';
  } });
  const imp = h('input', { type: 'file', accept: '.json,application/json', onChange: async (e) => {
    try { store.importAll(await e.target.files[0].text()); msg.textContent = 'Backup restored ✔'; refresh(); } catch (err) { msg.textContent = '⚠ ' + err.message; }
  } });
  return h('div', { class: 'form', onChange: apply },
    h('label', { class: 'field' }, h('span', {}, "Child's first name"), name),
    h('label', { class: 'field' }, h('span', {}, 'Soft session cap (minutes)'), cap),
    h('label', { class: 'field' }, h('span', {}, 'Voice speed'), rate),
    h('label', { class: 'field' }, h('span', {}, 'Voice (★ = most natural on this device; try a few with Test voice)'), voice),
    h('p', { class: 'hintline' }, `Speaking with: ${currentVoiceName()}`),
    btn('🔊 Test voice', { cls: 'ghost', onClick: () => { apply(); speak('Hello detective. Let us solve some words.'); } }),
    h('h3', {}, 'Tutor PIN'), h('div', { class: 'btn-row' }, p1, setPin),
    h('h3', {}, 'Backup / move to another device'),
    h('p', { class: 'hintline' }, 'Progress is saved only in this browser. To use another device, export here and restore there. Nothing is ever sent anywhere.'),
    h('div', { class: 'btn-row' }, btn('Export backup', { cls: 'ghost', onClick: () => download(`word-detective-backup-${new Date().toISOString().slice(0, 10)}.json`, store.exportAll()) }),
      h('label', { class: 'file' }, 'Restore backup ', imp)),
    h('h3', {}, 'Danger zone'),
    btn('Delete everything on this device', { cls: 'ghost danger', onClick: () => { if (confirm('Delete ALL data stored by this app on this device: progress, settings and added lessons?')) { store.deleteAll(); msg.textContent = 'Everything deleted.'; refresh(); } } }),
    btn('Reset all progress', { cls: 'ghost danger', onClick: () => { if (confirm('Erase all progress, points and badges on this device?')) { store.resetProgress(); msg.textContent = 'Progress reset.'; refresh(); } } }),
    msg);
}
