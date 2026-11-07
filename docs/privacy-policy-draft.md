# Word Detective: privacy policy (DRAFT, not legal advice)

> Status: working draft that matches how the app behaves today. It has **not** been reviewed by a lawyer. Do not publish it, or offer the app to other families, until it has been. Items in [brackets] must be filled in.

**Who we are:** [business name and address], contact: [privacy email].

## Who this is for
Word Detective is a reading practice app for children. Accounts are for **parents, guardians and tutors**, never for children. We do not knowingly collect information directly from a child.

## What we collect and why
| Data | When | Why | Where |
|---|---|---|---|
| Child's first name, picture, grade, progress, points, badges, practice history | Always | To run the lessons and show progress | On the device; in the cloud only if the adult signs in |
| Adult's email and password (hashed) | Cloud account | Login | Supabase (United States) |
| Words missed on assessments, added lessons | Cloud account | To build practice lessons and sync devices | Supabase |
| Assessment photos | Only if photo sync is on | To show on the family's other devices | Supabase private storage, owner-only |
| One assessment photo, sent for AI reading | Only on the adult's request and with their permission | To find the words marked wrong | Sent to Anthropic via our function; not kept by us |
| Tutor's email in a share | When the owner shares | To give read-only access | Supabase |

We do not use advertising, tracking or analytics, and we do not sell personal information.

## Who else handles data (processors)
- **Supabase**: hosting, login, database, file storage. [Sign their data processing agreement; confirm region.]
- **Anthropic**: reads one photo at a time when requested. [Review their current API data-use and retention terms; consider a zero-retention arrangement.]
- **OpenAI**: used only before release to create fixed audio files from lesson text. No child data is sent.
- **GitHub Pages**: serves the website. [It sees standard web requests (IP address) like any host.]

## Parent rights
Access, correction and deletion: the app's tutor area lets an adult export a backup, reset a child's progress, stop sharing, delete stored photos, or delete the whole account and all cloud data. [Describe how to ask by email too, and the response time.]

## Children's privacy (US COPPA and similar)
[A lawyer must confirm the consent method before other families join. Typical options: verified email-plus consent, or another FTC-approved method. Describe it here, how a parent withdraws consent, and what is deleted.]

## Security
Data is encrypted in transit; the database enforces per-user access rules (row-level security) and storage is owner-only. [Add breach-notification commitment and retention period for inactive accounts.]

## Changes and contact
[How changes are announced.] Contact: [privacy email].
