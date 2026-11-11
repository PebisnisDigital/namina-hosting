# NAMANA integration follow-up, 7 November 2026

## Owner-confirmed targets

- GitHub: PebisnisDigital/NAMINA, feature branch feat/namana-studio-mvp.
- Vercel: existing project `namana`, production domain `naminapro.vercel.app`.
- Supabase: existing NAMANA project `xglpwdgygzhjsmiwkzgj`.
- Vercel already has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for All Environments. Reuse these; do not create a duplicate anon key or URL variable.

## Code alignment

Frontend, development API, public HTML/sitemap API and private server operations use the publishable-key variable. Legacy ANON_KEY remains optional compatibility, with lower priority. Server URL defaults to VITE_SUPABASE_URL; an explicitly supplied mismatched SUPABASE_URL still rejects. Auth continues to use the real Supabase SDK. Test fixtures are loaded only by tests; there is no application fallback to a mock backend.

Private server actions require the existing NAMANA `SUPABASE_SERVICE_ROLE_KEY`. This is a different privilege level from the public key, not a duplicate public key. Store it only as a server environment variable. A missing migration/service configuration returns 503, not a misleading rate-limit response.

## Actual access observed

- Cloud has no Supabase variables, Supabase Management token, database connection, Vercel token or Vercel project binding. Variables saved in Vercel are not automatically injected into this cloud machine.
- Git remote reads work through existing platform authentication.
- HTTPS CONNECT requests to `xglpwdgygzhjsmiwkzgj.supabase.co`, `naminapro.vercel.app` and `api.vercel.com` are denied with proxy 403. GitHub deployment API access is also denied.
- Cloud configuration draft now includes the required network destinations (including `mcp.supabase.com` and `api.supabase.com`), the two existing public variable names and a server-key requirement. Saving the draft did NOT apply it, supply values or publish an environment.
- No hosted schema/RLS/Storage inspection or database mutation has been performed. The existing migration file is unchanged.
- Vercel CLI 65.12.1 reports `Logged out` when run with a writable task-specific config directory. No anonymous/temporary deployment was created.

## Supabase MCP

The requested `codex mcp add supabase --url 'https://mcp.supabase.com/mcp?project_ref=xglpwdgygzhjsmiwkzgj&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cfeedback%2Cnotebooks'` completed successfully. CLI status shows the server enabled and authentication `unknown`.

`codex mcp login supabase --no-browser` failed during OAuth metadata discovery. A direct request to the MCP hostname confirmed proxy CONNECT 403. It is not authenticated. Once network settings are applied, retry `codex mcp login supabase` in an interactive Codex terminal and complete the official OAuth flow. Use `/mcp` in that Codex session to confirm authentication; `/mcp` is a UI command, not a shell command. The current chat has not gained callable Supabase MCP tools simply from adding the CLI configuration. Reload/connect a session that loads the authenticated server before attempting schema inspection. Do not paste tokens or OAuth callback URLs into chat. Optional Agent Skills are not required to authenticate and were not installed.

## Manual actions that unblock actual integration

1. In cloud environment settings, review/save the proposed network destinations and securely mirror the SAME existing Vercel public variables into the cloud. Use the NAMANA URL `https://xglpwdgygzhjsmiwkzgj.supabase.co`. Enter the existing NAMANA server key securely for the server-key requirement. Never put values in chat or source. Apply/save settings to the running environment; review/publish the environment configuration when required by the UI. This is separate from deploying the application to production.
2. In Supabase Dashboard select project `xglpwdgygzhjsmiwkzgj` → SQL Editor. Run `supabase/inspect-namana.sql` first. It is a read-only transaction. Check existing namana_* tables, RLS, function permissions and ALL Storage policies. Bucket `namana-media` must be private. If namespaces already exist, compare them to the migration and stop on differences; do not replay CREATE statements or replace existing schema blindly.
3. Only after inspection confirms the migration is absent and there are no conflicts, apply `supabase/migrations/202611070001_namana.sql` through the project's supported migration workflow. It is not a destructive replacement. Retain existing users/data. Then repeat the inspection and test actual negative cross-tenant requests.
4. In Vercel project `namana` → Settings → Environment Variables, keep the two existing public variables unchanged. Add the EXISTING NAMANA `SUPABASE_SERVICE_ROLE_KEY` for Preview (server only). SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not required. Set APP_ORIGIN to the actual Preview origin once created, then redeploy Preview.
5. In Supabase Authentication → URL Configuration add the exact Preview callback `<preview-origin>/auth`. Keep the existing production Site URL unchanged; no production deployment is authorized. Confirm invitation-only registration and the existing SMTP configuration. Use controlled real admin/A/B accounts for Auth, upload, autosave, publish/restore and isolation tests.
6. In Vercel project `namana` → Settings → Git confirm PebisnisDigital/NAMINA and confirm the feature branch is NOT the Production Branch. After the branch push, open Deployments and select the Preview for feat/namana-studio-mvp and the pushed commit. If no automatic Preview appears, use Create Deployment for that Git ref with target Preview, or use the following commands from an authenticated machine:

```sh
vercel link --project namana --scope <existing-team-slug>
# Select only the existing project. Stop if the CLI proposes creating a new project.
vercel deploy --target=preview
```

Do not use --prod, promote a deployment or change DNS. Copy the actual Preview URL from Vercel; no guessed URL is a verified deployment. If Git push is denied, the safe manual push is:

```sh
git push --set-upstream origin feat/namana-studio-mvp
```

## Verification status

Lint, frontend/server typecheck, 18 unit/SQL/server tests, 7 browser tests and production build pass. Browser tests run with only the publishable-key variable, not the legacy anon variable. Test TypeScript checking also passes. The read-only inspection script was executed against the disposable test database, not the hosted project. Git push status is reported separately after the push attempt. Local fixtures do not prove hosted Auth/Storage, email delivery, schema readiness or deployment health. Live integration and a working Preview URL remain unverified until the access above is available.
