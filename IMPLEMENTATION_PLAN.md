# NAMANA.PRO implementation

## Audit, 7 November 2026

- Existing checkout is NAMANA. HEAD, remote main and remote card-both-sides-preview match 9b6dc4fa1981121bd8733bb770a67c0e9de8df92. No application changes existed before work. Feature branch: feat/namana-studio-mvp.
- React 19, TypeScript 6, Vite 8, Framer Motion and a CSS 3D wallet. Preserve IdentityFlip and identity-flip.css, including draw/exchange paths, swipe, wheel and keyboard behavior. The reference has one document face per selected card; do not invent a different renderer.
- Live reference request is denied by the environment outbound policy (CONNECT 403). Baselines use the exact verified source commit locally, not a claimed live-site comparison.
- No Supabase URL, project identity, app key, service key, database configuration or Vercel project binding is available. No remote database writes or deployments until NAMANA identity is established. Git read access works.
- Existing TS2367 is a stale comparison to phase=loading; fix during implementation. Existing lint warning is a ref cleanup in unused ScrollStack.

## Delivery sequence

1. Capture desktop/mobile original baseline; extract typed runtime schema/defaults; parameterize the existing renderer without changing its choreography. New accounts use clearly labeled neutral sample content, never Teh Vini's identity by default.
2. Add Studio: true iframe viewport, selectable canvas elements, inspector, card CRUD/reorder, media/theme, undo/redo, debounced optimistic save, safe retry/conflicts and explicit publish.
3. Add Supabase Auth adapter, migrations and server RPCs: profiles, roles, templates, sites, drafts, immutable versions, assets, preview tokens and audit logs. Default-deny RLS; owner/admin checks on every mutation. Draft and published snapshots stay separate.
4. Add login/reset/account, dashboard, superadmin clients/sites/template/settings, public slug and expiring preview. Invitation server endpoint keeps service credentials out of the browser.
5. Run unit, real SQL/RLS integration tests in disposable local PostgreSQL-compatible engine, browser interaction/security tests, lint/typecheck/build. Then test actual NAMANA integrations and Vercel Preview when access arrives. Production requires final approval.

## Module map

- src/domain: shared Zod schema, default ORIGINAL data, URL/slug/media validators.
- src/components/IdentityFlip.tsx: original renderer with typed content, media resolver and editor selection hooks.
- src/platform: Supabase client, auth, persistence and asset adapter. No silent local-only replacement for production persistence.
- src/pages: landing, login, dashboard, admin and Studio; iframe canvas uses the same renderer.
- supabase/migrations: additive schema and restricted grants/policies; RPC transaction boundary for provisioning, save, publish, restore, suspension and preview.
- api: authenticated invitation and media validation/signing functions; no trusted client role claims.
- tests: schema, links, slug, tenant isolation, revision conflicts, immutable snapshots, suspension, preview expiry and browser workflows.
- vercel.json: SPA fallback with API protection and security headers. .env.example contains names only.

## Visual direction

ORIGINAL retains DESIGN.md: ENERGY 3 / RHYTHM 2 / MOTION 3. Studio is a working editing desk: ENERGY 1 / RHYTHM 2 / MOTION 1, warm paper controls around the dark original stage, brass accent for selected objects/actions. Solid panels and readable native controls separate editing from the cinematic preview. No commerce statistics or invented customer proof.

## Launch gate

Local tests do not prove remote Supabase/Vercel readiness. AC-01 live reference comparison, hosted Auth/storage, cross-account API checks and AC-12 preview deployment remain blocked until identified project access is available. No production deployment, DNS change or destructive migration is authorized. Document tested outcomes and external prerequisites in QA_REPORT.md.
