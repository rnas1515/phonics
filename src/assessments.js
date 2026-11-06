// Tutor tab: add an assessment (photo + the words he missed) and build a practice lesson from it.
import { h, today } from './util.js';
import { btn } from './ui.js';
import * as store from './store.js';
import { allLessons } from './lessons.js';
import { normalizeLesson } from './validate.js';
import { buildFixLesson, guessSkill } from './assessment.js';
import { savePhoto, getPhoto, deletePhoto, shrink } from './photos.js';

export function assessmentsTab(refresh) {
  const child = store.currentProfile();
  const lessons = allLessons();
  const skillOpts = [['', 'Not sure (find it for me)'], ...lessons.filter((l) => l.kind === 'lesson' && !l.assessment).map((l) => [l.skill, l.title])];
  const msg = h('p', { class: 'hintline', role: 'status' });
  let photoBlob = null;

  const title = h('input', { type: 'text', value: 'Assessment', maxlength: 40, 'aria-label': 'Assessment name' });
  const date = h('input', { type: 'date', value: today(), 'aria-label': 'Assessment date' });
  const preview = h('img', { class: 'assess-photo', alt: 'Assessment photo', hidden: true });
  const file = h('input', { type: 'file', accept: 'image/*', 'aria-label': 'Choose a photo of the assessment' });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      photoBlob = await shrink(f);
      preview.src = URL.createObjectURL(photoBlob);
      preview.hidden = false;
      msg.textContent = 'Photo added. Look at it, then type the words he missed.';
    } catch { msg.textContent = 'Could not read that picture. Try another photo.'; }
  });

  const rows = h('div', { class: 'word-rows' });
  const addRow = () => {
    const w = h('input', { type: 'text', placeholder: 'Missed word', 'aria-label': 'Missed word', maxlength: 24 });
    const sk = h('select', { 'aria-label': 'Skill for this word' }, skillOpts.map(([v, l]) => h('option', { value: v }, l)));
    const se = h('input', { type: 'text', placeholder: 'Sentence (optional)', 'aria-label': 'Practice sentence', maxlength: 90 });
    w.addEventListener('change', () => { if (!sk.value) { const g = guessSkill(w.value, lessons); if (g) sk.value = g; } });
    const row = h('div', { class: 'profile-row wr' }, w, sk, se, btn('✕', { cls: 'ghost small', onClick: () => row.remove() }));
    row.read = () => ({ word: w.value, skill: sk.value, sentence: se.value });
    rows.append(row);
  };
  addRow(); addRow(); addRow();

  const build = btn('Build practice lesson', { cls: 'primary', onClick: async () => {
    const words = [...rows.children].map((r) => r.read()).filter((x) => x.word.trim());
    const { lesson, summary, errors } = buildFixLesson({ date: date.value || today(), grade: store.currentGrade(), words, lessons, title: `Fix-it: ${title.value.trim() || 'Assessment'}` });
    if (!lesson) return (msg.textContent = errors.join(' '));
    const check = normalizeLesson(lesson, 'custom');
    if (!check.lesson) return (msg.textContent = 'Could not build the lesson: ' + check.errors.join('; '));
    store.saveCustomLessons([...store.getCustomLessons(), lesson]);
    store.setActive(lesson.id, true); // on for this child only
    const photo = photoBlob ? `${store.currentProfileId()}/${lesson.id}` : null;
    if (photo) await savePhoto(photo, photoBlob).catch(() => {});
    store.addAssessment({ id: lesson.id, date: date.value || today(), title: title.value.trim() || 'Assessment', photo, words: words.map((x) => ({ word: x.word.trim().toLowerCase(), skill: x.skill })), lessonId: lesson.id });
    msg.textContent = `Built "${lesson.title}" with ${summary.coded} coding word(s)${summary.similar ? `, ${summary.similar} set(s) of similar words` : ''} and ${summary.sight} reading word(s). It is on ${child.name}'s home screen. ${summary.notes.join(' ')}`;
    setTimeout(refresh, 2500);
  } });

  const past = store.getAssessments().map((a) => {
    const img = h('img', { class: 'assess-thumb', alt: '', hidden: true });
    if (a.photo) getPhoto(a.photo).then((b) => { if (b) { img.src = URL.createObjectURL(b); img.hidden = false; } });
    return h('div', { class: 'profile-row' }, img,
      h('div', { class: 'grow' }, h('strong', {}, `${a.title} · ${a.date}`), h('p', { class: 'hintline' }, a.words.map((w) => w.word).join(', '))),
      lessons.some((l) => l.id === a.lessonId) ? h('a', { class: 'btn ghost small', href: `#/mission/${a.lessonId}` }, 'Open case') : h('span', { class: 'chip' }, 'lesson removed'),
      btn('Delete', { cls: 'ghost small danger', onClick: async () => {
        if (!confirm(`Delete this assessment record${a.photo ? ' and its photo' : ''}? The practice lesson stays unless you delete it in the Lessons tab.`)) return;
        if (a.photo) await deletePhoto(a.photo);
        store.removeAssessment(a.id); refresh();
      } }));
  });

  return h('div', {},
    h('p', { class: 'hintline' }, `Add a recent assessment for ${child.name}: a photo (optional) and the words he missed. The app builds a practice lesson from them. Photos stay on this device only and are deleted with the child's data.`),
    h('div', { class: 'form' },
      h('label', { class: 'field' }, h('span', {}, 'Name'), title),
      h('label', { class: 'field' }, h('span', {}, 'Date'), date),
      h('label', { class: 'field' }, h('span', {}, 'Photo of the assessment'), file),
      preview,
      h('h3', {}, 'Words he missed'),
      h('p', { class: 'hintline' }, 'Pick the skill if you know it. "Not sure" looks the word up in the lessons.'),
      rows,
      h('div', { class: 'btn-row' }, btn('Add a word', { cls: 'ghost', onClick: addRow }), build),
      msg),
    h('h3', {}, 'Past assessments'),
    past.length ? past : h('p', { class: 'hintline' }, 'None yet.'));
}
