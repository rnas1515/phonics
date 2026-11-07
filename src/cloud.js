// Optional cloud account (Supabase, plain web calls, no SDK). Off unless a project URL and key are configured.
// The app stays local-first: everything works offline, and changes are uploaded when signed in and online.
import * as realStore from './store.js';
import { planSync } from './syncplan.js';

const SESSION_KEY = 'wd.cloud.v1';
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export function createCloud({ url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_ANON_KEY, fetch: f, store = realStore, now = () => Date.now() } = {}) {
  const doFetch = (...a) => (f || globalThis.fetch)(...a);
  const configured = !!(url && key);
  const base = (url || '').replace(/\/$/, '');

  const load = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || {}; } catch { return {}; } };
  const save = (s) => { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ } };
  const state = () => load();

  async function call(path, { method = 'GET', body, token, headers = {} } = {}) {
    const res = await doFetch(base + path, {
      method,
      headers: { apikey: key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    if (!res.ok) {
      const err = new Error(data?.msg || data?.error_description || data?.message || data?.error || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function adopt(d) {
    if (!d?.access_token) return false;
    save({ ...load(), access: d.access_token, refresh: d.refresh_token, expiresAt: now() + (d.expires_in || 3600) * 1000, email: d.user?.email || load().email, uid: d.user?.id || load().uid });
    return true;
  }

  async function signUp(email, password) {
    if (!configured) throw new Error('Cloud is not set up');
    const d = await call('/auth/v1/signup', { method: 'POST', body: { email, password } });
    return adopt(d) ? { signedIn: true } : { signedIn: false, needsConfirm: true };
  }
  async function signIn(email, password) {
    if (!configured) throw new Error('Cloud is not set up');
    adopt(await call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } }));
    return { signedIn: true };
  }
  async function signOut() {
    const s = load();
    if (s.access) { try { await call('/auth/v1/logout', { method: 'POST', token: s.access }); } catch { /* offline is fine */ } }
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }
  async function token() {
    const s = load();
    if (!s.access) throw new Error('Not signed in');
    if (s.expiresAt - 60000 > now()) return s.access;
    adopt(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh } }));
    return load().access;
  }
  /** Call a server function as the signed-in user. */
  async function invoke(name, body) {
    if (!configured) throw new Error('Cloud is not set up');
    return call(`/functions/v1/${name}`, { method: 'POST', token: await token(), body });
  }
  /** Authenticated call to the data API (used by sharing). */
  async function api(path, opts = {}) {
    if (!configured) throw new Error('Cloud is not set up');
    return call(path, { ...opts, token: await token() });
  }
  const signedIn = () => configured && !!load().access;

  /** Two-way sync: newest change wins, per child and per added lesson. */
  async function syncNow() {
    if (!configured) throw new Error('Cloud is not set up');
    const t = await token();
    const stamp = new Date(now()).toISOString();
    const meta = store.getSyncMeta();
    const counts = { pulled: 0, pushed: 0 };

    // Only this account's own rows: children shared BY other families are visible to a tutor but are never synced as theirs.
    const uid = load().uid || (await call('/auth/v1/user', { token: t })).id;
    const [rc, rl] = await Promise.all([
      call(`/rest/v1/children?select=local_id,name,avatar,grade,progress,active,updated_at,deleted&owner=eq.${uid}`, { token: t }),
      call(`/rest/v1/custom_lessons?select=id,data,updated_at,deleted&owner=eq.${uid}`, { token: t }),
    ]);

    // children
    const cRemote = new Map(rc.map((x) => [x.local_id, x]));
    const cPlan = planSync({ localKeys: store.getProfiles().map((p) => p.id), at: meta.at.children, gone: meta.gone.children, remote: rc.map((x) => ({ key: x.local_id, updated_at: x.updated_at, deleted: x.deleted })) });
    for (const id of cPlan.pull) { if (store.importChild(cRemote.get(id), cRemote.get(id).updated_at)) counts.pulled++; }
    for (const id of cPlan.drop) store.removeChildLocal(id);
    const cRows = [];
    for (const id of cPlan.push) { const c = store.exportChild(id); if (c) cRows.push({ ...c, deleted: false, updated_at: meta.at.children[id] || stamp }); }
    for (const id of cPlan.pushDelete) cRows.push({ local_id: id, name: '', progress: {}, active: {}, deleted: true, updated_at: meta.gone.children[id] });
    if (cRows.length) await call('/rest/v1/children?on_conflict=owner,local_id', { method: 'POST', token: t, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: cRows });
    for (const r of cRows) { if (r.deleted) store.clearGone('children', r.local_id); else store.setSynced('children', r.local_id, r.updated_at); counts.pushed++; }
    cPlan.forget.forEach((id) => store.clearGone('children', id));

    // added lessons
    const lRemote = new Map(rl.map((x) => [x.id, x]));
    const lessons = store.getCustomLessons();
    const lPlan = planSync({ localKeys: lessons.map((l) => l.id), at: meta.at.lessons, gone: meta.gone.lessons, remote: rl.map((x) => ({ key: x.id, updated_at: x.updated_at, deleted: x.deleted })) });
    for (const id of lPlan.pull) { store.importLesson(lRemote.get(id).data, lRemote.get(id).updated_at); counts.pulled++; }
    for (const id of lPlan.drop) store.removeLessonLocal(id);
    const lRows = [];
    for (const id of lPlan.push) { const l = lessons.find((x) => x.id === id); if (l) lRows.push({ id, data: l, deleted: false, updated_at: meta.at.lessons[id] || stamp }); }
    for (const id of lPlan.pushDelete) lRows.push({ id, data: {}, deleted: true, updated_at: meta.gone.lessons[id] });
    if (lRows.length) await call('/rest/v1/custom_lessons?on_conflict=owner,id', { method: 'POST', token: t, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: lRows });
    for (const r of lRows) { if (r.deleted) store.clearGone('lessons', r.id); else store.setSynced('lessons', r.id, r.updated_at); counts.pushed++; }
    lPlan.forget.forEach((id) => store.clearGone('lessons', id));

    save({ ...load(), last: new Date(now()).toISOString(), lastError: null });
    return counts;
  }

  /** Never throws: records the problem so the tutor screen can show it. */
  async function trySync() {
    try { return await syncNow(); } catch (e) { save({ ...load(), lastError: e.message }); return null; }
  }

  return { configured, signedIn, state, signUp, signIn, signOut, syncNow, trySync, invoke, api };
}

export const cloud = createCloud();

/** Sync at start, when the app comes back to the screen, and shortly after changes. */
export function startAutoSync() {
  if (!cloud.configured) return;
  let timer = null, busy = false;
  const run = async () => { if (busy || !cloud.signedIn() || navigator.onLine === false) return; busy = true; try { await cloud.trySync(); } finally { busy = false; } };
  const later = () => { clearTimeout(timer); timer = setTimeout(run, 10000); };
  window.addEventListener('wd:update', () => { if (!busy) later(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
  window.addEventListener('online', run);
  run();
}
