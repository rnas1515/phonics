# Questions for Rabih / the teacher

The school's own reference pages (see `docs/notation.md`) settled most notation questions. What is still open:

1. **ck.** The chart seems to show a slash through the c in ck, but the Coding Reminders example (duck) only shows an underline.
   The app grades underline only. Which does the school require?
2. **oo.** The chart shows a macron or breve over the first o for the two oo sounds, plus the underline. The app accepts underline only
   (your brief says children are only required to underline). Should the sound mark be required?
3. **Vowel teams still without lessons.** ei, ea as long a (steak), ea as short e coding (breve), ou (soup), oo sound marks, and the
   advanced stable syllables (tion, sion, tious, ture, cious). Lessons now exist for ea (long e), ow (long o), ue/ie/ey, aw/au/ew,
   and igh/tch/dge/eigh. For igh/tch/dge the chart seems to show extra slashes on some letters; the app grades the underline only. Confirm.
4. **Voice lines and schwa.** Lessons exist but are narrow: schwa only on the quiet first a (about, around), voice line only on s saying z (has, is, dogs). Voiced th, other voiced consonants, and schwa in other positions (banana, hotel) are not taught. Which words and letters does the school want?
5. **Accent marks and V/C labels** in syllable division are not built yet (only the dividing line).
6. **Lesson numbers.** Confirmed so far: L4, L6, L9, L11, L14, L26, L37, L38, L40, L61, L103, L110, L136. Sneaky e, suffixes, prefixes and
   most new lessons are unplaced. The Gemini notes' lesson numbers contradict these and are ignored.
7. **Order.** `curriculum.json` order for lessons without a number is my guess. Please check it.
8. **Possessive apostrophe (L14).** Only singular 's vs plain plural s is taught. Plural possessives are left out.
9. **ai / ay.** Taught as "ay usually at the end, ai usually in the middle" (a tendency). Confirm the teacher's wording.
10. **ke and c endings.** Rules come from your brief. Confirm the lesson number and wording.
11. **Sight words.** "I read it" is self-reported and tracked separately. Should a tutor confirm after each sight-word session?
12. **Gemini notes.** Its "snaffled" mark, a dot on soft g, and crossing out twin consonants do not appear on the school pages, so they are not used.
13. **Prefixes and suffixes.** Taught so far: un-, re-, pre-, dis-, mis- and -ed, -ing, -ly, -er, -est, -ful, -less, -ness, -s, -es, with a box only.
    The "Real Affix or Not?" lesson asks whether a real word is left when the ending or beginning is removed. Not built yet: dropping the silent e
    (bake + ing) and doubling the last consonant (hop + ing). Your brief lists them at L103. Please confirm the school's wording and which endings come first.

## From the school's weekly schedule (Aug 28 to Oct 30, 2026)
The schedule is in `schedule.json`. Teaching order and the check-up follow it. New lessons built from it, with my assumptions:
14. **Floss rule.** Taught as: one short vowel, ends with f/l/s/z sound, double the last letter (ff, ll, ss, zz); exceptions if, of, bus, yes, us.
    Coding task = breve on the vowel only. Does the school use any other mark?
15. **Wild Colt rules.** Taught as: old, ild, ind, olt, ost say the long vowel; coding task = macron on the vowel.
    Is this how the school words it? Any words that should be excluded (for example lost, cost)?
16. **Doubling and dropping rules.** Taught as sorting tasks (double / drop e / just add), no coding. Does the school also mark the word (crossing out the e)?
17. **V|CV (open syllables).** Teaches "try dividing after the first vowel (ba|by), else after the consonant (cab|in)". Accent marks and V/C labels are not built.
18. **Final ch / tch and final ge / dge.** Built as the one-letter game, like ck/k. Exceptions listed for ch: much, such, rich, which.
19. **ph, wh, ei, oa.** ph: underline. wh: arc (the chart lists it with the combinations). ei: underline, with the long a / long e sounds as a sorting task.
    oa: accepts underline or the full macron + slash + underline pattern. Please confirm the marks for wh and ei.
20. **Compound words.** Taught as dividing between the two words, plus real compound or not. Not a coding mark on the school pages; confirm it is meant to be practised this way.
21. **Not built, unclear:** the "o" (week of Oct 9) and the "a" (week of Oct 16). Also the sight words for the other weeks. Please send the sight-word lists.
22. **Ghost letter digraphs** (kn, wr, gn): now a coding task (slash the silent letter, underline the pair), as shown on the school chart.
