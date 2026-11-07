// Plain-language privacy page, shown in the app. It describes what the app actually does today.
import { h } from './util.js';

export function privacyScreen(root) {
  const sec = (title, ...items) => h('section', { class: 'card' }, h('strong', {}, title), h('ul', {}, items.map((t) => h('li', {}, t))));
  root.replaceChildren(h('div', { class: 'panel' },
    h('h2', {}, '🔒 Privacy'),
    h('p', { class: 'hintline' }, 'In plain words: what Word Detective keeps, where it goes, and how to delete it.'),
    sec('On this device',
      "Your child's first name, picture, grade, points, progress and practice history are saved in this browser only.",
      'There are no ads, no trackers and no analytics. Nothing is sold or shared for marketing.',
      'Speech uses the device voice, or pre-made recordings stored with the app. No voice or microphone is recorded.'),
    sec('If a parent or tutor turns on a cloud account',
      'Their email (for login), each child\'s first name, picture, grade, progress, added lessons and the words missed on assessments are stored in a private account on Supabase servers in the United States.',
      'Only the account owner can see it, plus tutors the owner chooses to share with (read-only, by email).',
      'Assessment photos stay on the device unless the parent turns on photo sync. Then they are stored privately and no tutor can see them.'),
    sec('Reading an assessment photo with AI (optional)',
      'Only if a parent agrees, one photo at a time: it is sent over a secure connection to Anthropic, the company that makes Claude, to read the handwriting. Our server does not keep the photo.',
      'The tutor checks every word before a lesson is made.'),
    sec('Your choices',
      'Tutor area, Settings: export a backup, reset one child\'s progress, or delete everything on this device.',
      'Cloud account: sign out, stop sharing, delete stored photos, or delete the whole account and all its cloud data.',
      'Children should use first names only.'),
    h('p', { class: 'hintline' }, 'This is a summary of how the app works today. A full privacy policy and parent consent will be published before the app is offered to other families.'),
    h('a', { class: 'btn primary', href: '#/' }, 'Back to HQ')));
  return () => {};
}
