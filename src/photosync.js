// Optional: keep assessment photos in the family's private cloud storage so they show on their other devices.
// Off by default. Photos are never uploaded unless the parent turns this on.
import { cloud, hooks } from './cloud.js';
import * as store from './store.js';
import { getPhoto as localGet, savePhoto as localSave } from './photos.js';

const FLAG = 'wd.photosync.v1';
export const photoSyncOn = () => { try { return !!JSON.parse(localStorage.getItem(FLAG))?.on; } catch { return false; } };
export const setPhotoSync = (on) => { try { localStorage.setItem(FLAG, JSON.stringify({ on: !!on, at: new Date().toISOString() })); } catch { /* ignore */ } };

export const PHOTO_CONSENT = [
  "I am this child's parent or guardian, or have their parent's permission.",
  'Photos of assessments will be stored in my private cloud account (Supabase), visible only to me. Tutors I share progress with cannot see them.',
  'I can turn this off and delete the stored photos at any time. Please avoid photos showing a full name, address or other personal details.',
];

/** Upload new photos and download missing ones. deps lets tests run without a browser. */
export async function syncPhotos({ getPhoto = localGet, savePhoto = localSave, c = cloud, s = store } = {}) {
  const out = { up: 0, down: 0 };
  if (!photoSyncOn() || !c.signedIn()) return out;
  const uid = c.state().uid;
  if (!uid) return out;
  for (const kid of s.getProfiles()) {
    const prog = s.exportChild(kid.id)?.progress;
    for (const a of prog?.assessments || []) {
      if (!a.photo) continue;
      const have = await getPhoto(a.photo);
      if (have && !a.cloudPhoto) {
        const path = `${uid}/${a.photo}.jpg`;
        await c.putFile(path, have);
        s.updateAssessment(kid.id, a.id, { cloudPhoto: path });
        out.up++;
      } else if (!have && a.cloudPhoto) {
        await savePhoto(a.photo, await c.getFile(a.cloudPhoto));
        out.down++;
      }
    }
  }
  return out;
}

/** Remove every photo this account stored in the cloud (the copies on devices stay). */
export async function deleteCloudPhotos({ c = cloud, s = store } = {}) {
  let n = 0;
  for (const kid of s.getProfiles()) {
    for (const a of s.exportChild(kid.id)?.progress?.assessments || []) {
      if (!a.cloudPhoto) continue;
      try { await c.deleteFile(a.cloudPhoto); } catch (e) { if (e.status !== 404 && e.status !== 400) throw e; }
      s.updateAssessment(kid.id, a.id, { cloudPhoto: null });
      n++;
    }
  }
  return n;
}

hooks.afterSync = () => syncPhotos();
