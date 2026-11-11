# Connect the existing NAMINA services

> Name updated to NAMINA.PRO on 8 Nov 2026. Existing Supabase project, `NAMANA_*` environment variable names, migration filenames and storage identifiers remain unchanged to preserve compatibility.

For the current integration prerequisites see [INTEGRATION_STATUS.md](INTEGRATION_STATUS.md). No remote database migration, project creation, DNS change or production deployment has been performed. Local test transports are fixtures, never an application fallback.

## Confirm the projects

1. The owner confirmed the existing **NAMANA** Supabase project `xglpwdgygzhjsmiwkzgj`, URL `https://xglpwdgygzhjsmiwkzgj.supabase.co`. Keep key values in settings, not chat or Git. Do not select PESONAFLIX or BADAI.
2. The owner confirmed the existing Vercel project **namana**, domain **naminapro.vercel.app**. Under Git confirm `PebisnisDigital/NAMINA`. Do not import a new project or reconnect a PESONAFLIX project. The feature branch is `feat/namana-studio-mvp`.
3. The cloud instance currently has no Supabase/Vercel variables, no `.env` or `.vercel/project.json`, and no Vercel login. Git read works, but GitHub deployment API and the supplied live reference are blocked by outbound policy. Add required destinations in environment network settings: `api.github.com`, `api.vercel.com`, `naminapro.vercel.app`, the exact supplied reference hostname, and the verified `<project-ref>.supabase.co`. Add the actual generated Preview hostname after it is known. Never replace an unknown allowlist.

## Environment values

In the existing Vercel project's Settings / Environment Variables, reuse the two existing All Environments public variables. No duplicate key or URL is needed. Add only missing server requirements for **Preview**:

| Variable | Source / scope |
| --- | --- |
| `VITE_SUPABASE_URL` | Verified NAMANA project URL, browser-safe |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Existing NAMANA publishable key; not the service key |
| `SUPABASE_SERVICE_ROLE_KEY` | NAMANA secret service role key, server only; never use a VITE_ prefix |
| `APP_ORIGIN` | Exact HTTPS origin of the verified NAMANA Preview deployment |

Use the same variable names in secure cloud settings to enable integration checks here. Values must be present in the running environment, not merely declared in a draft. No secret is needed in Git. Legacy VITE_SUPABASE_ANON_KEY is an optional lower-priority fallback; do not create it for this project. SUPABASE_URL is optional because the server reuses VITE_SUPABASE_URL; an explicitly configured mismatch still rejects.

## Additive database setup

Run `supabase/inspect-namana.sql` first in the verified project. It is read-only and includes ALL Storage object policies. Only if the migration is absent and there are no conflicts, apply `supabase/migrations/202611070001_namana.sql` using the project's migration workflow. It creates `namana_*` entities, a private `namana-media` bucket, functions/policies and an Auth profile trigger. It does not replace tables or drop data. Do not blindly replay it over existing entities. It has been executed against disposable PostgreSQL/PGlite locally, not against hosted NAMANA.

Bootstrap the first superadmin only through trusted SQL Editor, after creating/inviting that verified account in Supabase Auth. Use the actual user UUID locally in the dashboard:

```sql
insert into public.namana_profiles(user_id,email)
select id,email from auth.users where id = '<verified-admin-user-uuid>'::uuid
on conflict(user_id) do nothing;
insert into public.namana_roles(user_id,role)
values ('<verified-admin-user-uuid>'::uuid,'superadmin');
```

Never assign roles through editable user metadata. Existing Auth users are not automatically granted any role. Other existing clients can be provisioned with a profile entry through trusted administration; do not alter or delete existing users.

## Auth and email

In Supabase Authentication / URL Configuration, keep the existing production Site URL unchanged and add `<preview-origin>/auth` to Redirect URLs for testing. Confirm invitation-only registration and existing SMTP/sender configuration. Verify invitation/reset delivery with controlled test inboxes. Do not change production configuration to work around a Preview callback error.

The invitation API issues a server-side invitation, creates a NAMANA profile, and records an audit event. Website provisioning is a separate transaction: if it fails, the invited account remains recoverable and can be provisioned later. No fake paid/order status is created. Resend access uses password reset to the same verified callback.

## Preview and final QA

Once the correct Vercel project binding is confirmed, push the feature branch and use that project's **Preview** workflow or `vercel deploy` with its existing linked project. Do not pass `--prod`. Set APP_ORIGIN to that Preview URL, add its Auth callback, redeploy Preview if necessary, and run all hosted acceptance cases with two controlled clients and the superadmin.

Uploads go directly to a private bucket, then server verification inspects actual MIME, dimensions, bytes, H264 MP4 track and duration before the asset may be saved/published. Default limits are technical test defaults (5 MiB images, 20 MiB videos, 100 MiB/site, 120 seconds, 3840 px), configurable in Admin within tested server bounds. No transcoding is implemented. Pending uploads can be cancelled; verified historical media must remain until an explicit retention policy is approved. Signed delivery URLs expire after five minutes and are refreshed while the page stays open. Revoking preview does not revoke already issued media URLs before that expiry.

Run `npm ci --cache /workspace/.npm-cache`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Browser tests use Chromium installed at `/usr/bin/chromium`; hosted tests must additionally use real Supabase Auth, Storage and Vercel routes. Check Safari/Edge, touch, video failure, long content, quota errors and all callbacks.

## Production gate and rollback

Production is blocked until hosted two-user isolation, email/upload/publish/restore, live ORIGINAL comparison, Vercel routing/headers and mobile QA pass. Finalize public support/contact and commercial privacy/terms before accepting payment. Take a database backup using the project's supported backup tools and verify the recovery procedure. Request the owner's single final go-live approval only after presenting the verified Preview result. Do not treat the local build or this document as that approval.

Rollback an application release through Vercel's previous deployment while retaining the database and immutable published snapshots. No automatic destructive down migration or data deletion is supplied. Restore a site version into draft and republish through checked server RPCs rather than rewriting history.
