# NAMINA.PRO

NAMINA is a multi-client cinematic website built from one GitHub repository and one Vercel project. The ORIGINAL wallet and 3D card experience is reused for each client's profile. This repository is separate from the existing PESONAFLIX production system.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | NAMINA landing page |
| `/vini` | ORIGINAL cinematic demo with Vini's profile and video |
| `/studio` | Password-protected content editor for the admin team |
| `/:client-slug` | Published client website |

`/demo` redirects to `/vini`. Former Supabase-specific login/admin/dashboard routes redirect to `/studio` for existing bookmarks. Legacy files and SQL migrations remain in Git history but are not used by these routes.

## Content and deployment

1. Admin signs into `/studio` using a server-checked password. The password and GitHub access token are not sent to the browser.
2. Admin edits identity, card text, colors, title size, images and external video URLs. Draft changes stay in the current browser until published.
3. Publishing validates the document and commits `public/clients/{slug}.json` to the configured GitHub branch using the GitHub Contents API.
4. Vercel builds and deploys that branch. The published client URL then reads the newly deployed JSON file. Publishing data does not immediately update a currently deployed page until Vercel finishes its build.

`/vini` is backed by the ORIGINAL seed from `src/static/originalProfileTabs.ts` when no `public/clients/vini.json` has been published yet. New clients start with an independent blank profile. An unknown slug does not show Vini's profile.

Images and videos are not uploaded to GitHub or Supabase through Studio. Admins paste an HTTPS media URL. Dropbox shared links normally need `raw=1` for direct display. Keep a poster image as fallback: external hosts may throttle streaming or block embedded playback. `public/videos/hero.mp4` remains the default Vini video.

> Rebranding note: deployment remains linked to the existing Supabase database. Legacy `NAMANA_*` environment variable names and `namana_*` database identifiers are preserved to keep active Studio sessions, media, and data working. The production URL is `https://naminapro.vercel.app`, and the GitHub repository is `PebisnisDigital/NAMINA`.

## Environment configuration

Use `.env.example` as a checklist. Set these **server-only** variables on Vercel:

- `NAMANA_GITHUB_REPO`: repository owner/name, e.g. `PebisnisDigital/NAMINA`.
- `NAMANA_GITHUB_BRANCH`: exact target branch. Production typically uses `main`. Use a separate preview branch for staging; otherwise a publish from a preview deployment can update production.
- `NAMANA_GITHUB_TOKEN`: fine-grained GitHub PAT with **Contents: Read and write** on this repo only.
- `NAMANA_ADMIN_PASSWORD`: unique password of at least 12 characters for the Studio team.
- `NAMANA_SESSION_SECRET`: separate, high-entropy random signing secret of at least 32 characters.

Do not prefix these variables with `VITE_`. Never commit their values or paste them into the frontend. Restrict and monitor `/api/studio` with Vercel Firewall/rate limiting before opening Studio to public traffic. The cookie is signed, HttpOnly, Secure, SameSite=Strict and expires after 12 hours. For multiple editors and stronger auditing, move toward individual accounts rather than sharing one admin password.

## Local development

Use Node 24 and npm 11:

```sh
npm ci
npm run dev
```

Without the environment variables, the landing page and public demo work. `/studio` explains which configuration is missing. Legacy Supabase services are not needed for the current routing.

## Validation

```sh
npm run lint
npm run typecheck
node --import tsx --test tests/*.test.ts
npm run build
```

The older tests still exercise Supabase-era code paths retained in the repository. New tests cover the static client schema, Vini seed, video-link validation and invalid content. A passing build does not certify a live Vercel deployment or a working GitHub token. Test the preview branch and publish a sample before switching production traffic.
