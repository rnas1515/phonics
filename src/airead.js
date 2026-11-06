// Opt-in AI reading of an assessment photo. Needs a cloud account; the photo goes to a server function
// that asks Claude which words were marked wrong. The tutor always checks the words before a lesson is built.
import { cloud } from './cloud.js';

const CONSENT_KEY = 'wd.aiconsent.v1';
export const hasConsent = () => { try { return !!JSON.parse(localStorage.getItem(CONSENT_KEY))?.at; } catch { return false; } };
export const giveConsent = () => { try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ at: new Date().toISOString() })); } catch { /* ignore */ } };
export const withdrawConsent = () => { try { localStorage.removeItem(CONSENT_KEY); } catch { /* ignore */ } };
export const aiAvailable = () => cloud.configured && cloud.signedIn();

export const CONSENT_TEXT = [
  "I am this child's parent or guardian, or I have their parent's permission.",
  'When I tap "Read this photo with AI", that one photo is sent over a secure connection to Anthropic, the company that makes Claude, to read the handwriting. It is not saved on our server.',
  "Anthropic's handling of the photo is covered by their own terms. Please do not use photos that show a full name, address or other personal details.",
  'AI can misread handwriting. I will check every word before a lesson is built.',
];

/** Keep only plausible spellings. Pure, so it can be tested. */
export function cleanWords(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map((x) => ({ word: String(x?.word || '').toLowerCase().replace(/[^a-z']/g, '').slice(0, 24), attempt: String(x?.attempt || '').slice(0, 30), note: String(x?.note || '').slice(0, 80) }))
    .filter((x) => x.word.length > 1 && !seen.has(x.word) && seen.add(x.word))
    .slice(0, 30);
}

const toBase64 = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1] || '');
  r.onerror = () => rej(new Error('Could not read the picture'));
  r.readAsDataURL(blob);
});

export async function readPhoto(blob) {
  const out = await cloud.invoke('read-assessment', { image: await toBase64(blob), mediaType: 'image/jpeg' });
  return { words: cleanWords(out?.words), unclear: String(out?.unclear || '') };
}
