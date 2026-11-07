# Backlog

Things we agreed to do later, roughly in the order to pick them up. Update this file as items are done.

## Next up
1. **Natural voice (pre-recorded audio).** The iPad gives web pages only basic voices, so the device voice stays robotic.
   Plan: generate audio once for lesson lines and practice words with a neural voice service (OpenAI is the cheapest good option), ship the files in the app (works offline, same on every device). Typed words such as assessment words would still use the device voice, unless a later step generates them on demand.
   **Status: built, waiting only for the audio to be generated** (see `docs/voice.md`; about $1). Needs: a voice-service API key (entered through the secure form, never in chat) and approval to let the session reach that service.
   Free things to try first: send the "Speaking with: …" line from tutor Settings; Enhanced and Premium voices under Settings, Accessibility, Read & Speak, Voices.

## After that
2. ~~**Tutor login**~~ Done: read-only sharing by email and a Shared with me tab (see `docs/cloud.md`). Possible later: tutor can add notes, or edit lessons.
3. ~~**Photo sync**~~ Done: opt-in private cloud storage (see `docs/cloud.md`).
4. **Mobile app wrap** for iOS and Android (Capacitor), keeping the web code.
5. **Before other families sign up:** privacy policy, parental consent, deletion on request, and legal review of children's privacy rules (COPPA and similar).

## Waiting on Rabih
- Confirm the 1st-grade lesson tags (see `docs/open-questions.md`) and the other open coding questions listed there.
- The unclear "o" and "a" items on the school schedule, and sight-word lists for other weeks.

## Housekeeping
- Delete the Supabase setup token (`claude-setup`) when no more server changes are planned.
- Change the tutor PIN from the default 1234 on each device.
