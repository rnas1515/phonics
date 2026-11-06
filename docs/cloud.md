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
