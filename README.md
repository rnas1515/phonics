# Word Detective

Private phonics practice for Marcelo (Saxon Reading Foundations 2 level). Static site: Vite + vanilla JS, no backend,
no accounts, no analytics. Progress lives in the browser (`localStorage`); instructions are read aloud with the
browser's text-to-speech. Works offline after the first load (PWA).

    npm install
    npm run dev      # local dev server
    npm test         # validate all lessons
    npm run build    # static site in dist/

* **Lessons:** JSON files in `lessons/` (format: `docs/lesson-schema.md`) or the in-app form (Tutor view).
* **Tutor view:** footer link 🔒. Default PIN `1234`; change it in Settings. A soft gate, not security.
* **Deploy:** pushing to `main` deploys to GitHub Pages (Settings → Pages → Source: GitHub Actions).
  Pages links are unlisted (`noindex`), not private. For real access control use Cloudflare Access or a Netlify password.
* **Other devices:** progress is per browser. Tutor → Settings → Export / Restore backup moves it.
