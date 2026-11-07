# Natural voice (recorded audio)

The device voice is robotic on iPads (web pages only get basic voices). The app can instead play recorded audio made once with a high-quality voice.

## How it works
- `scripts/voice-corpus.mjs` collects everything the app says that does not depend on a child's answers (lesson text, instructions, practice words, explanations, praise) and splits it into sentences.
- `scripts/make-voice.mjs` records each sentence once and writes `public/voice/<key>.mp3` plus `public/voice/manifest.json`. It is safe to re-run: it only makes missing files.
- In the app, `speak()` plays the recordings when every sentence of a line has one (for example "Nice detective work!" then "chimp."). Otherwise, and if the browser refuses audio, it uses the device voice as before.
- Words typed later (assessment words) have no recording, so they use the device voice until the script is run again after the lesson is added to `/lessons`.

## Cost and size
`node scripts/make-voice.mjs --dry` prints the numbers. Currently about 2,200 sentences, 57,000 characters: roughly $1 with `tts-1`, about 20 MB of audio. Check current pricing.

## Generate (once you have an OpenAI API key)
1. Create a key at platform.openai.com and set a monthly spend limit there. Never paste it in chat or commit it.
2. Locally: `OPENAI_API_KEY=... node scripts/make-voice.mjs`, then commit `public/voice/`.
3. Or ask Claude to run it in a session: the key goes through the secure credential form, and the session needs approval to reach `api.openai.com`.
4. Different voice or quality: `VOICE_NAME=shimmer VOICE_MODEL=tts-1-hd node scripts/make-voice.mjs` (delete `public/voice/` first to re-record).

The audio files are cached by the browser when first played, so lines work offline after they have been heard once.
