// Assessment photos: small copies kept in this browser only (IndexedDB), keyed per child. Never uploaded.
const DB = 'wd-photos';
const open = () => new Promise((res, rej) => {
  if (typeof indexedDB === 'undefined') return rej(new Error('no storage'));
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore('p');
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const run = async (mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction('p', mode);
    const out = fn(tx.objectStore('p'));
    tx.oncomplete = () => { db.close(); res(out?.result); };
    tx.onerror = tx.onabort = () => { db.close(); rej(tx.error); };
  });
};

export const savePhoto = (key, blob) => run('readwrite', (s) => s.put(blob, key));
export const getPhoto = (key) => run('readonly', (s) => s.get(key)).catch(() => null);
export const deletePhoto = (key) => run('readwrite', (s) => s.delete(key)).catch(() => {});
/** Remove every photo that belongs to one child. */
export const deletePhotosFor = (profileId) =>
  run('readwrite', (s) => {
    const req = s.openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { if (String(c.key).startsWith(profileId + '/')) c.delete(); c.continue(); } };
    return req;
  }).catch(() => {});
export const deleteAllPhotos = () => { try { indexedDB.deleteDatabase(DB); } catch { /* ignore */ } };

const looksHeic = (f) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name || '');

/** Shrink a picked image to a small JPEG so it is cheap to keep. HEIC (iPhone) is converted if the browser cannot open it. */
export async function shrink(file, max = 1400, quality = 0.72) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch (e) {
    if (!looksHeic(file)) throw new Error('Could not open that picture. Try a JPEG or PNG.');
    // Two converters, newest first: iPhone files come in several variants and one library may not read them all.
    const tries = [
      async () => { const { heicTo } = await import('heic-to'); return heicTo({ blob: file, type: 'image/jpeg', quality: 0.8 }); },
      async () => { const { default: heic2any } = await import('heic2any'); const o = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 }); return Array.isArray(o) ? o[0] : o; },
    ];
    const why = [];
    for (const t of tries) {
      try { bmp = await createImageBitmap(await t()); break; } catch (err) { why.push(String(err?.message || err?.code || err).slice(0, 80)); }
    }
    if (!bmp) throw new Error(`Could not convert that HEIC photo (${why.join(' / ')}). Export it as a JPEG and try again.`);
  }
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not read that picture'))), 'image/jpeg', quality));
}
