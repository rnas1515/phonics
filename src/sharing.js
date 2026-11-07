// Share a child's progress with a tutor (read-only), and see what has been shared with you.
import { cloud } from './cloud.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A short, read-only summary of one child's progress document. Pure. */
export function summarizeProgress(p = {}) {
  const skills = Object.values(p.skills || {});
  const attempts = skills.reduce((n, k) => n + (k.attempts || 0), 0);
  const correct = skills.reduce((n, k) => n + (k.correct || 0), 0);
  const trouble = Object.entries(p.words || {})
    .filter(([, w]) => (w.wrong || 0) > 0 && !w.seeded)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .slice(0, 8)
    .map(([word, w]) => ({ word, wrong: w.wrong, attempts: w.attempts }));
  const last = (p.sessions || []).slice(-1)[0];
  return {
    points: p.points || 0,
    badges: Object.keys(p.badges || {}).length,
    streak: p.streak?.count || 0,
    mastered: skills.filter((k) => k.masteredAt).length,
    practiced: skills.filter((k) => k.attempts).length,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : null,
    sessions: (p.sessions || []).length,
    lastSession: last?.date || null,
    assessments: (p.assessments || []).length,
    trouble,
  };
}

export const validEmail = (e) => EMAIL.test(String(e || '').trim());

export const listShares = () => cloud.api('/rest/v1/shares?select=tutor_email,created_at&order=created_at.asc');
export async function addShare(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!validEmail(e)) throw new Error('That does not look like an email address.');
  await cloud.api('/rest/v1/shares?on_conflict=owner,tutor_email', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: [{ tutor_email: e }] });
}
export const removeShare = (email) => cloud.api(`/rest/v1/shares?tutor_email=eq.${encodeURIComponent(String(email).toLowerCase())}`, { method: 'DELETE' });

/** Children other people have shared with me (never my own). */
export async function sharedWithMe() {
  const uid = cloud.state().uid;
  const q = '/rest/v1/children?select=owner,local_id,name,grade,progress,updated_at,deleted&deleted=eq.false' + (uid ? `&owner=neq.${uid}` : '');
  const rows = await cloud.api(q);
  return rows.map((r) => ({ owner: r.owner, id: r.local_id, name: r.name, grade: r.grade, updated: r.updated_at, summary: summarizeProgress(r.progress) }));
}
