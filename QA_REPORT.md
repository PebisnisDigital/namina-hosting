# NAMANA MVP verification

Date: 7 November 2026. Scope: local feature branch `feat/namana-studio-mvp`.

**Release decision: NOT READY FOR PRODUCTION.** Hosted NAMANA integrations and Preview remain externally blocked. No production project was modified, no migration was applied remotely and no new Supabase/Vercel project was created. Integration follow-up details are in INTEGRATION_STATUS.md.

## Evidence

- Repository HEAD and both remote reference branches matched `9b6dc4fa1981121bd8733bb770a67c0e9de8df92` before changes. ORIGINAL uses the existing CSS 3D wallet, document flight/exchange, swipe, wheel and keyboard engine.
- `npm run lint`: passes without warnings.
- `npm run typecheck`: passes for frontend, Vite/dev API and server.
- `npm test`: 18 passing tests, including nine SQL/RLS subtests and publishable-key-only server configuration. No failures or skips. The read-only inspection SQL is also executed in the disposable database.
- Test TypeScript files also passed an independent TypeScript check.
- `npm run build`: passes, 573 modules. Frontend bundle inspection found no server-key variable name, test key or test password.
- Development API smoke request returns JSON 503 with an explicit backend-configuration message when keys are missing. It does not silently serve HTML or pretend the operation succeeded.
- `npm run test:e2e`: latest full run passed all 7 tests in 1 minute, with no page errors, failures or skips.

## Database and server cases executed

The real migration runs in a disposable PGlite PostgreSQL engine with `anon`, `authenticated` and `service_role`, an Auth UID shim and Storage metadata schema. This verifies SQL semantics/RLS, not the hosted Auth/Storage service configuration.

- One site per owner; reserved slug rejection and uniqueness.
- A cannot read B's sites/drafts/profile/media, save B's draft, publish B, restore B, revoke B's preview or write B's Storage object path.
- Client cannot assign a superadmin role or write protected tables directly.
- Optimistic save increments revision; stale revision rejects rather than overwrites.
- Published content remains unchanged by subsequent draft saves. Versions cannot be edited through client table access.
- Restore creates a new draft and preserves immutable version history.
- Preview token is random, hashed in storage, snapshot-specific, revocable and expires.
- Invalid links/content, foreign verified assets, unsupported MIME, individual size, total quota and mutation rate limits reject direct calls.
- Suspension removes public lookup and prevents publish. Administrative actions are audited.
- Server parses real PNG and H264 MP4 bytes. Wrong format, forged images, excessive dimensions/size/duration and fake MP4 reject.
- Server HTTP adapter tests reject client invitation attempts, verify a real image before marking the asset ready, gate public signing, and reject mismatched project URLs. Hosted invitation email delivery is untested.

## Browser and click-through record

Browser tests use real SQL/RLS and actual local HTTP multipart file transport, with simulated Supabase Auth transport and Storage/operations adapters. The production application never imports these fixtures.

- Client login fixture → own dashboard → Edit web.
- Name edit → live iframe update → autosave → refresh persistence.
- Wallet click in canvas → wallet inspector; color edits remain in draft.
- Card add, text/link edit, duplicate, undo, redo and delete update the real renderer data.
- Desktop uses a true 1280 px iframe; HP uses its own narrow viewport.
- Save/retry → Publish → public slug reads the immutable snapshot.
- Later private name edit does not appear on the public page.
- Create preview → open draft snapshot → revoke preview → revoked link rejects.
- Version history → restore into draft; public content remains controlled by publish.
- Simulated failed save → visible error → retry succeeds. Two tabs → stale tab gets conflict and retains its text.
- Admin provisions fixture client C, modifies slug/suspension, saves template/quota settings and sees commerce disabled. Client cannot enter admin.
- SVG upload rejects; PNG and MP4 upload through the Studio, server inspection and SQL verification, then publish. Public renderer receives the uploaded media references.
- ORIGINAL at 390/768/1440 px: enter, open wallet, next card via keyboard, video failure fallback and reduced motion. No document-level horizontal overflow.
- Logout returns to login. Browser page errors are asserted absent. External font requests and deliberately aborted video requests can emit expected network errors; these are not hidden as successful requests.

Other controls have real handlers and have been inspected. Hosted positive invitation/reset, cross-browser/touch testing and every commercial/legal requirement are not certified by this local click-through.

## Visual evidence and local design gate

- Baseline: `qa/baseline/{desktop,mobile}-{wallet,card}.png` from the original commit before renderer changes.
- Responsive output: `qa/original-{390,768,1440}.png`.
- Studio with media: `qa/studio-media.png`.
- Exact live-site visual comparison is blocked by outbound CONNECT 403. Fonts were unavailable in the test browser; screenshots also exercise fallback typography. Do not present these as pixel equality against the live reference.

Local antislop gate evidence (scope excludes the inaccessible hosted integrations):

- Hard gate, function/honesty: PASS for tested controls above; no invented revenue, customers or paid transactions. Missing backend has an explicit state. No claim of hosted readiness.
- Purpose/direction: PASS, ORIGINAL retains the existing dark stage and material wallet; the Studio uses a warm editing desk and brass selection accent. Dials and rationale are in IMPLEMENTATION_PLAN.md.
- Liveliness: PASS for source-preserving ORIGINAL interaction and a separate, restrained editing workspace; no replacement template was introduced.
- Layout/accessibility: PASS for measured viewport overflow, native inspector controls, keyboard card navigation, visible focus and reduced-motion/video controls in tested Chromium cases. Text contrast measured: ink/paper 14.09:1, muted/paper 5.88:1, brass/paper 5.16:1, video-control text/background 15.86:1. Input border/background is 3.40:1 for non-text contrast. This is not a blanket WCAG certification.
- Quality locks: PASS for the inspected/tested local scope; empty/loading/error states, undo/redo, retry, immutable publishing and recoverable conflicts are implemented. Full hosted delivery remains unapproved.

## Acceptance status and outstanding prerequisites

| Criterion | Local evidence | Remaining launch work |
| --- | --- | --- |
| AC-01 ORIGINAL | Correct source, baseline, responsive interaction and poster fallback | Compare exact live reference; fonts and hosted media |
| AC-02 tenant isolation | Direct SQL/RLS negative tests with A and B | Repeat against two real NAMANA Auth accounts and API requests |
| AC-03 live edit | Name, cards, wallet, media and inspector update | Complete hosted real-client content pass |
| AC-04 autosave | Refresh, retry and two-tab conflict tested | Real network/offline recovery in Preview |
| AC-05 draft isolation | SQL and browser snapshot separation tested | Hosted confirmation |
| AC-06 publish | Atomic RPC and browser public lookup tested | Vercel slug routing and hosted storage |
| AC-07 restore | New draft from immutable history tested | Hosted confirmation |
| AC-08 admin | Provision, suspend, slug, settings, denied client tested | Real positive invite/reset and mailbox delivery |
| AC-09 media safety | Bytes/MIME/dimensions/duration/quota/ownership tests and browser upload | Actual Supabase bucket and signing configuration |
| AC-10 responsive/accessibility | Chromium 390/768/1440, keyboard, reduced-motion/video failure | Safari, Edge, touch, 200% zoom and long-content manual QA |
| AC-11 commerce | Disabled, no financial data fabricated | Decisions remain deferred |
| AC-12 deployment | Feature branch and Vercel routing/configuration prepared | Verified project binding, real Preview URL, hosted QA, final production approval |

Exact prerequisites and dashboard steps are in RELEASE_SETUP.md. Commercial policies/support, backups/recovery, domain ownership/DNS and observability beyond audit logs still need operational verification before paid/public launch. No production approval is requested until the Preview is actually verified.
