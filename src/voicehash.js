// The same text must map to the same audio file in the browser and in the build script.
export const normalizeSpeech = (t) => String(t).replace(/\s+/g, ' ').trim();

/** 53-bit string hash (cyrb53): short, stable, and collision-safe at this scale. */
export function speechKey(text) {
  const s = normalizeSpeech(text);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Split speech into sentences (the unit that gets recorded). */
export const sentencesOf = (text) => (normalizeSpeech(text).match(/[^.!?]+(?:[.!?]+|$)/g) || []).map((x) => x.trim()).filter(Boolean);
/** Recordings are keyed without the closing punctuation, so "chimp." and "chimp" share one file. */
export const sentenceKey = (sentence) => speechKey(sentence.replace(/[.!?\s]+$/, ''));
