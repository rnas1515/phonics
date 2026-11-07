// Everything the app says that does not depend on a child's answers: lesson text, instructions, words, explanations.
import { readdirSync, readFileSync } from 'node:fs';
import { normalizeLesson } from '../src/validate.js';
import { sentencesOf, sentenceKey } from '../src/voicehash.js';

const PRAISE = ['Nice detective work!', 'Case solved!', 'You got it!', 'Sharp eyes!', 'Exactly right!'];
const FIXED = [
  'Hello detective. Let us solve some words.', 'Sound on.', 'Pick a game.', 'Read this word.', 'Nice reading!', 'You fixed it! Nice job.',
  'Look at the ONE letter right before the blank.',
  'Look at the ONE letter right before the k sound. Short vowel alone: c k. Consonant or vowel team: just k.',
];

export function collect(dir = new URL('../lessons/', import.meta.url)) {
  const out = new Map(); // key -> the sentence to record
  const add = (t) => {
    for (const sentence of sentencesOf(t || '')) {
      const key = sentenceKey(sentence);
      const old = out.get(key);
      if (sentence.replace(/[.!?\s]+$/, '').length > 0 && (!old || /[.!?]$/.test(sentence) && !/[.!?]$/.test(old))) out.set(key, sentence);
    }
  };
  FIXED.forEach(add);
  PRAISE.forEach(add);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const { lesson: L } = normalizeLesson(JSON.parse(readFileSync(new URL(f, dir), 'utf8')), 'built-in');
    if (!L) continue;
    [L.say, L.trickText, L.example?.say, ...(L.bands || []).map((b) => b.say)].forEach(add);
    const d = L.discover;
    if (d) [d.intro, d.question, d.reveal, ...(d.groups || []).map((g) => g.why), ...(d.options || []).map((o) => o.label)].forEach(add);
    for (const a of L.activities) {
      add(a.instruction);
      for (const it of a.items) {
        if (it.word && !/^story:/.test(it.word)) {
          add(it.word);
          PRAISE.forEach((p) => add(`${p} ${it.word}.`));
          add(`Good listening! ${it.word}.`);
          add(`That word is ${it.word}.`);
        }
        if (it.why) { add(it.why); add(`Not quite. ${it.why}`); }
        if (it.sentence) add(it.sentence);
        if (it.passage) add(it.passage);
        if (it.question) add(it.question);
      }
    }
  }
  return [...out].map(([key, text]) => ({ key, text }));
}
