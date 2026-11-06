// Mistake-specific tips: look at WHAT went wrong and say the one idea that fixes it (pure, no DOM).
const BLENDS = new Set(['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'sc', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'tr', 'tw', 'scr', 'spr', 'str', 'spl', 'squ', 'nd', 'nt', 'nk', 'mp', 'ft', 'lt', 'lk', 'ld', 'lf', 'lp', 'sk', 'xt']);

/**
 * word: the word being coded. detail: from gradeCoding ([{i, extra:[marks], missing:[marks]}]).
 * Returns one short tip, or '' when nothing specific applies.
 */
export function mistakeTip(word, detail = []) {
  const w = word.toLowerCase();
  const at = (mark) => detail.filter((d) => d.extra.includes(mark)).map((d) => d.i).sort((a, b) => a - b);

  // 1. A blend got underlined: two sounds, so no mark.
  const ul = at('underline');
  for (let k = 0; k < ul.length - 1; k++) {
    for (let len = 3; len >= 2; len--) {
      const run = ul.slice(k, k + len);
      if (run.length === len && run.every((x, j) => x === run[0] + j)) {
        const letters = w.slice(run[0], run[0] + len);
        if (BLENDS.has(letters)) return `"${letters}" is a blend: say it slowly and you hear BOTH sounds. Blends get no mark. Only underline letters that team up to make ONE new sound.`;
      }
    }
  }
  // 2. A silent letter with no slash (the last e is the usual one).
  const noSlash = detail.filter((d) => d.missing.includes('strike'));
  if (noSlash.length) {
    const ch = w[noSlash[0].i];
    return ch === 'e' && noSlash[0].i === w.length - 1
      ? 'Does the e at the end say anything? If it stays silent, it gets a slash.'
      : `Listen for the "${ch}": if you cannot hear it, it is silent and gets a slash.`;
  }
  // 3. Short vs long vowel mixed up.
  const swap = detail.find((d) => (d.extra.includes('breve') && d.missing.includes('macron')) || (d.extra.includes('macron') && d.missing.includes('breve')));
  if (swap) {
    return swap.missing.includes('macron')
      ? 'Does this vowel say its name (long, macron)? That happens at the end of a syllable, or with a sneaky e or a vowel team.'
      : 'A vowel with a consonant closing it in says its short sound: breve.';
  }
  // 4. Marks on letters that need none.
  const extraOnly = detail.filter((d) => d.extra.length && !d.missing.length);
  if (extraOnly.length && extraOnly.length === detail.length) return 'Some letters need no mark at all. Mark only what you can hear or see the rule for.';
  return '';
}
