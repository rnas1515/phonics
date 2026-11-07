# Before other families sign up (checklist, not legal advice)

Today the app is for one family and their tutor. Opening it to others (friends, then the public or schools) changes your legal duties. Get a lawyer experienced in children's privacy to review this list.

## Already built
- [x] No ads, trackers or analytics.
- [x] Adults hold the accounts; children play without logging in.
- [x] Per-user data isolation (row-level security) and owner-only photo storage, tested in the database.
- [x] Parent permission before AI reading of a photo and before photo sync.
- [x] In-app deletion: delete a child's progress, stored photos, or the whole cloud account (function `delete-account`).
- [x] Read-only sharing with a tutor, removable at any time.
- [x] Plain-language privacy page in the app (`#/privacy`).

## To do
- [ ] Lawyer reviews `docs/privacy-policy-draft.md`; fill in the business name, address, contact email; publish it at a stable URL (also required by the app stores).
- [ ] Parental consent method (US COPPA: verifiable parental consent before collecting a child's personal information). Decide the mechanism and build it into sign-up.
- [ ] Data processing agreements with Supabase and Anthropic; confirm data region and retention; consider Anthropic zero-data-retention for photos.
- [ ] Retention rule for inactive accounts and a way to request deletion by email.
- [ ] Breach response plan and who to notify.
- [ ] Age and region rules beyond the US (UK/EU children's codes and GDPR) if families outside the US join.
- [ ] If selling to schools: school privacy rules (for example FERPA in the US) and school contracts.
- [ ] Terms of service, and decide pricing and payments (payments add their own rules).
- [ ] Stronger sign-in: require confirmed emails (already on), consider rate limits and password rules.
- [ ] Security review before launch (secrets, dependency updates, backups).
