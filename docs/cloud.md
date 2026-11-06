# Cloud account (optional)

The app works fully offline on one device. With a free Supabase project it can also back up progress and sync it between devices.
Without the two settings below, the cloud is simply off and nothing changes.

## What is stored
Per child: first name, picture, grade, progress, points, badges, active lessons, assessment records (words missed). Lessons added in the tutor view.
**Not stored in the cloud:** assessment photos (they stay on the device), the tutor PIN, voice settings.
Every row belongs to the signed-in user; row-level security stops anyone else reading it.

## Set up (about 10 minutes)
1. Create a free project at supabase.com. In **SQL Editor, New query**, paste all of `supabase/schema.sql` and press Run.
2. **Authentication, Providers:** Email is on by default. Decide whether to require email confirmation (recommended) under Authentication, Sign In / Up.
3. **Project Settings, API:** copy the Project URL and the `anon` public key. Never use or share the `service_role` key.
4. Local copy: `cp .env.example .env`, fill in the two values, run `npm run build`.
5. GitHub Pages: in the repository, **Settings, Secrets and variables, Actions, Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (variables, not secrets: they are public by design), and pass them to the build step in `.github/workflows/deploy.yml` as `env:`.
6. In the app: Tutor view, Settings, **Cloud account**: Create account, then sign in on each device.

## How sync works
- Newest change wins, per child and per added lesson. Deleting a child or lesson reaches the other devices.
- It syncs at start, when the app returns to the screen, when the connection comes back, and about 10 seconds after changes.
- On a second device, sign in before practicing there, so the account's data comes down first. If both devices changed the same child, the later change wins and the other is overwritten.

## Not done yet (next steps)
- Separate tutor login (a tutor seeing several families), photo upload, AI reading of photos with parent consent, mobile app wrap, and the legal work needed before other families sign up (children's privacy rules such as COPPA).

## AI reading of assessment photos (optional)
In the tutor view, Assessments tab, after choosing a photo and signing in, **Read this photo with AI** asks Claude which words were marked wrong and fills in the word list. The tutor must check every word before building the lesson.

How it works: the app sends the shrunk photo to the Supabase Edge Function `read-assessment` (`supabase/functions/read-assessment/index.ts`). The function checks the user is signed in, enforces 20 reads per user per day, calls the Anthropic API and returns only a short list of words. The photo is not stored by the function. The Anthropic key lives only as a Supabase secret, never in the app or in GitHub.

### Set up
1. Run the new part of `supabase/schema.sql` again (it adds the `ai_usage` table; the file is safe to re-run).
2. Create an API key at console.anthropic.com (set a monthly spend limit there). **Do not paste it in chat or in GitHub.**
3. Supabase, **Edge Functions**, **Secrets** (or Project Settings, Edge Functions): add `ANTHROPIC_API_KEY` with that key.
4. Supabase, **Edge Functions**, **Deploy a new function**, **Via Editor**: name it exactly `read-assessment`, paste the contents of `supabase/functions/read-assessment/index.ts`, and Deploy. Leave "Verify JWT" on.
5. In the app: sign in, add a photo, tap the button, and agree to the parent permission note the first time.

### Privacy
Parent permission is asked once per device and can be withdrawn; every photo also needs a "Send this one photo?" confirmation. The photo goes to Anthropic over a secure connection. Check Anthropic's current data-use terms before you open this to other families, and see the legal note above.
