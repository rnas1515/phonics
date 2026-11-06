// Decide what to pull, push or drop when syncing one kind of record (children, lessons). Pure, no DOM.
const ms = (iso) => (iso ? Date.parse(iso) || 0 : 0);

/**
 * localKeys: ids that exist on this device. at: {id: iso} when each was last changed or synced.
 * gone: {id: iso} deleted here. remote: [{key, updated_at, deleted}].
 * Newest change wins. Returns { pull, push, pushDelete, drop, forget } (lists of ids).
 */
export function planSync({ localKeys, at = {}, gone = {}, remote }) {
  const r = new Map(remote.map((x) => [x.key, x]));
  const local = new Set(localKeys);
  const out = { pull: [], push: [], pushDelete: [], drop: [], forget: [] };
  for (const key of new Set([...local, ...Object.keys(gone), ...r.keys()])) {
    const rem = r.get(key);
    const L = ms(at[key]);
    if (!rem) {
      if (local.has(key)) out.push.push(key);
      else out.forget.push(key); // deleted here and never uploaded: nothing to tell the server
      continue;
    }
    const R = ms(rem.updated_at);
    if (rem.deleted) {
      if (local.has(key)) (L > R ? out.push : out.drop).push(key);
      continue;
    }
    if (!local.has(key)) {
      const G = ms(gone[key]);
      if (G > R) out.pushDelete.push(key); else out.pull.push(key);
    } else if (R > L) out.pull.push(key);
    else if (L > R) out.push.push(key);
  }
  return out;
}
