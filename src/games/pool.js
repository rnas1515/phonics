// Word pools for the games, drawn from the same lessons he practices.
import { allLessons } from '../lessons.js';
import { getProgress, isActive } from '../store.js';
import { parseCodedFull } from '../coding.js';
import { shuffle } from '../util.js';

/** Active lessons he has worked on first; all active lessons if there are too few. */
function lessonsFor(minWords, collect) {
  const P = getProgress();
  const active = allLessons().filter((l) => isActive(l) && l.kind === 'lesson');
  const practiced = active.filter((l) => P.skills[l.skill]?.attempts > 0 || P.skills[l.skill]?.masteredAt);
  const fromPracticed = collect(practiced);
  return fromPracticed.length >= minWords ? fromPracticed : collect(active);
}

/** Pairs of a plain word and its coded form (code lessons, words up to 7 letters). */
export function codePairs(n = 6) {
  const all = lessonsFor(n, (ls) => {
    const out = [], seen = new Set();
    for (const l of ls) for (const a of l.activities) {
      if (a.type !== 'code') continue;
      for (const it of a.items) {
        if (seen.has(it.word) || it.word.length > 6) continue; // short words fit on a small card
        try {
          const parsed = parseCodedFull(it.answer);
          if (parsed.boundaries.size) continue; // divider lines make the coded card too wide
          out.push({ word: it.word, parsed }); seen.add(it.word);
        } catch { /* skip */ }
      }
    }
    return out;
  });
  return shuffle(all).slice(0, n);
}

/** Question sets for Sorting Rush: one activity at a time, so every question shares the same buttons. */
export function sortSets() {
  return lessonsFor(1, (ls) => {
    const sets = [];
    for (const l of ls) for (const a of l.activities) {
      if (a.type === 'sort') {
        const labels = a.categories.map((c) => c.label);
        sets.push({ title: l.title, labels, items: a.items.map((i) => ({ shown: i.word, word: i.word, answer: a.categories.find((c) => c.id === i.answer).label })) });
      } else if (a.type === 'fill' && !a.oneLetter) {
        sets.push({ title: l.title, labels: a.choices, items: a.items.map((i) => ({ shown: i.pattern.replace(/_+/g, ' ＿＿ '), word: i.word, answer: i.answer })) });
      }
    }
    return sets.filter((s) => s.items.length >= 8 && s.labels.length <= 4);
  });
}

/** Plain lowercase words (3 to 7 letters) for Mystery Word. */
export function mysteryWords(n = 5) {
  const all = lessonsFor(n * 3, (ls) => {
    const seen = new Set();
    for (const l of ls) for (const a of l.activities) for (const it of a.items) {
      const w = (it.word || '').toLowerCase();
      if (/^[a-z]{3,7}$/.test(w)) seen.add(w);
    }
    return [...seen];
  });
  return shuffle(all).slice(0, n);
}
