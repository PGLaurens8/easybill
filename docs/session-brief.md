# QuantEasy Session Brief

## Purpose

Use this document as the single running brief for the project.

Update it after each meaningful work session so we can:

- remember where we stopped
- track architecture decisions
- track deployment status
- capture blockers
- define the next exact actions

## Product Summary

QuantEasy is a contractor and quantity surveyor focused commercial management product for:

- projects
- contracts
- BOQ revisions
- progress claims
- QS certification
- payment certificates

The goal is to keep the product substantially simpler than large suites such as RIB Candy or BuildSmart while still being commercially accurate, secure, auditable, and production-ready.

## Current Architecture Decision

### Frontend

- Vite SPA on Vercel

### Backend

- FastAPI on Railway
- SQLAlchemy ORM
- Alembic migrations

### Platform services

- Supabase Postgres
- Supabase Auth
- Supabase Storage

## Current Status

### Completed

- frontend startup crash fixed so missing Supabase frontend env vars no longer blank-screen the app
- fix pushed to GitHub `main`
- README typo fixed
- `.gitignore` updated to exclude generated and sensitive local files
- Git history cleaned so oversized `.next` artifacts no longer block pushes
- Railway health endpoint verified live
- production migration confirmed run with `alembic upgrade head`
- Vercel production hostname confirmed as `https://easybill-ten.vercel.app`
- backend claim and certificate commercial workflow implemented in FastAPI
- frontend payment certificates screen added and routed into the SPA
- backend regression tests added for claim rules and certificate creation
- frontend regression tests added for certificate eligibility and issuance flow
- frontend API error formatting improved so live failures surface HTTP status and request IDs in the UI
- preview hard-restart instability reduced by replacing repeated service-worker unregister behavior with a one-time legacy cleanup path
- mobile workspace selector added so the first-run path is usable on smaller screens
- backend startup diagnostics added for effective CORS and database readiness
- backend enum persistence fixed so ORM values match the existing Postgres commercial enums
- backend request tracing added so API responses and error logs share an `X-Request-Id` value and the browser can read that header cross-origin

### Verified

- frontend `npm run build` passes
- frontend `npm test` passes
- Railway health endpoint responds at `https://quanteasy.up.railway.app/healthz`
- Railway API base URL is `https://quanteasy.up.railway.app`
- branch is pushed successfully to `origin/main`
- Railway startup logs now confirm:
  - effective `frontend_origins` include `https://easybill-ten.vercel.app`
  - database connectivity is good through the pooled Supabase connection
  - `organizations` and `memberships` tables exist in production

### Deployment State

#### Railway

- public API URL: `https://quanteasy.up.railway.app`
- health endpoint: `https://quanteasy.up.railway.app/healthz`
- health status: confirmed OK on 2026-03-18
- required backend env vars reported present
- `FRONTEND_ORIGIN` is now confirmed in startup logs
- production database connectivity is now confirmed with a Supabase session pooler URL
- startup diagnostics confirm `organizations` and `memberships` tables exist
- most recent unresolved production request-path issue was enum persistence during organization membership insert

#### Vercel

Known frontend URLs shared by the user:

- `https://easybill-ten.vercel.app`
- `https://quanteasy-pg-laurens-projects.vercel.app`
- `https://quanteasy-git-main-pg-laurens-projects.vercel.app`
- `https://quanteasy-zwnf19lnq-pg-laurens-projects.vercel.app`

Current confirmed production hostname:

- `https://easybill-ten.vercel.app`

## Current Blockers / Risks

- live authenticated end-to-end smoke testing is still outstanding
- the enum persistence fix for `membership_role` has been pushed but still needs live request-path verification in production
- the new certificate flow is still only locally verified; no live production smoke test has confirmed it end to end yet
- later, the Vercel production hostname should be renamed from `easybill-ten` to a `quanteasy` name to match the product

## Exact Next Steps

1. Ensure Railway is deployed from the latest `main`, including the enum persistence fix.
2. Open `https://easybill-ten.vercel.app` in an incognito window and log in.
3. Create an organization and confirm `POST /api/v1/organizations` succeeds.
4. If organization creation fails, capture the exact browser network response, the `X-Request-Id` header or `request_id` body field, and the matching Railway log entry.
5. If organization creation succeeds, continue the live smoke test: create project, create contract, create BOQ revision, create and approve a claim, then issue a payment certificate.
6. After the live flow is verified, rename the Vercel production domain from `easybill-ten.vercel.app` to a `quanteasy` hostname, then update `FRONTEND_ORIGIN` again.

## Session Log

### 2026-09-27

Summary: built what a QS needs for a real month-end (see docs/plan-month-end-ready.md): variations,
contra-charges, a contract page, valuation month on claims, a monthly payment schedule, and retention
release at practical / final completion (including a certificate without a claim).

Verified: backend 75 tests (acceptance scenario with exact figures); migrations to 20260927_000004 on
Postgres with RLS on every table; frontend 64 tests, lint, build; browser acceptance scenario (16 checks)
and the earlier invite walkthrough, no console or API errors.

Deploy: `alembic upgrade head` now runs migrations 000002-000004.

### 2026-09-26

Summary: Railway (API host) now requires a paid plan and Supabase is paused, so the stack moves to
free tiers: one Vercel project for app + API, Supabase for database and auth. Security review focused on
tenant isolation and consent-based connections between companies and subcontractors.

Done:

- API runs as a Vercel Python function (`api/index.py`, `vercel.json`, root `requirements.txt`); app calls
  it same-origin; serverless database settings for Supabase's transaction pooler. Verified locally.
- **Critical fix:** migration `20260926_000003` enables row-level security on all tables and revokes
  Supabase API role access. Previously anyone with the public anon key could read and edit all data.
- Consent-based invitations replace "add member": admin invites an email, the verified owner of that
  email accepts from a banner. Sign-up added to the login screen.
- CSV formula-injection guard, tighter CORS, request-id sanitising, payload caps, security headers.
- Demo seed script (`backend/scripts/seed_demo.py`).
- `docs/security-review.md` with findings, remaining risks, and marketplace/tendering foundation notes.

Verified: backend 67 tests; migrations up/down on Postgres with Supabase-style roles; frontend 55 tests,
lint, build; browser walkthrough including invite -> accept for four users.

Next:

1. Restore (or recreate) the Supabase project; keep "Confirm email" on; set Site URL.
2. Run `alembic upgrade head` against Supabase (session pooler, port 5432).
3. Create the Vercel env vars from `docs/setup-runbook.md` and redeploy.
4. Optionally run `seed_demo` and set the demo env vars.

### 2026-09-25

Summary: usability and commercial-correctness review from a main-contractor QS / director perspective,
followed by fixes and a restructure. Verified end to end in a real browser against FastAPI + Postgres.

Critical defects fixed:

- Claims could never be approved from the UI ("Approve" sent Submitted -> Approved, which the API
  rejected; "Review" led to a state with no buttons), so no certificate could ever be issued.
- Certificate valuation only counted the lines in the current claim, so a period that did not re-claim
  earlier items produced a negative certificate. Retention cap was ignored. A new BOQ revision reset
  previously certified quantities to zero (keyed by item id instead of item code).
- "Print certificate" always failed (`window.open` with `noopener` returns null).
- A Contractor-role user could see every subcontractor's contracts and rates.
- The initial Alembic migration failed on a fresh Postgres (enum types created twice).
- `.btn-secondary`, `.card`, `.eyebrow` were used everywhere but never defined.
- User IDs were sent to picsum.photos for avatars. No sign-out button existed.

Product changes:

- Contracts carry the subcontractor's company name and an optional subcontractor login. Subcontractors
  see only their own contracts and can submit claims.
- BOQ can be pasted from Excel; revisions publish and supersede automatically.
- Claims: automatic period numbers, % complete or quantity entry, remaining quantities, live totals,
  inline over-claim warnings, save & submit in one click, reject with a required reason, edit and
  resubmit after rejection.
- Certificates: the QS can adjust certified quantities and see the server-calculated payment figure
  before issuing; automatic certificate numbers; mark paid; void the latest certificate to correct it.
- Dashboard: per-role "needs attention" queue and a contract position table.
- Team: add people by email, remove members, plain-language roles.
- Removed ~2,600 lines of unused mock-data prototype code and the jspdf / xlsx / zustand dependencies.
- Backend `services/commercial.py` (970 lines) split into focused modules; role rules centralised in
  `core/permissions.py`; valuation maths is a pure, unit-tested module.
- ESLint now configured; ruff clean; `.venv` and `dist/` untracked from git.

Verified:

- backend: 59 tests (sqlite); flow and membership tests also pass against Postgres 16
- alembic upgrade / downgrade / upgrade on a fresh Postgres 16
- frontend: 48 tests, lint, type-check, production build
- scripted browser walkthrough (director -> subcontractor -> QS -> accounts, two periods with a rejection)

Deploy steps required:

1. Railway: deploy, then run `alembic upgrade head` (adds `contracts.subcontractor_name`,
   `contracts.subcontractor_user_id`, `memberships.email`).
2. Railway: confirm `SUPABASE_SERVICE_ROLE_KEY` is set so members can be added by email.
3. Vercel: redeploy.
4. Run the live smoke test, including a subcontractor login linked to a contract.

Behaviour changes to note for users:

- Quantity Surveyors and Commercial Managers now issue certificates (previously Admin/Accounts only);
  Accounts marks them paid and no longer approves claims.
- Rejecting a claim requires a reason.

### 2026-03-18

Summary:

- diagnosed the frontend blank-screen failure as an import-time crash when Supabase env vars are missing
- changed the frontend to fail visibly and safely instead of rendering nothing
- pushed the fix to GitHub after cleaning oversized generated files out of the unpublished local history
- confirmed Railway health is live at `https://quanteasy.up.railway.app/healthz`
- confirmed the production migration has been run
- confirmed Vercel production currently uses `https://easybill-ten.vercel.app`

Completed:

- pushed startup resilience fix to `main`
- fixed accidental README title typo
- added `.gitignore` rules for generated and sensitive local files
- verified `npm run build`
- confirmed Vercel has the expected frontend env var names
- confirmed Railway has the core backend env vars
- user ran `alembic upgrade head`

Blocked by:

- `FRONTEND_ORIGIN` needs to include `https://`
- live authenticated smoke test has not yet been completed
- production hostname still uses the old `easybill-ten` naming

Next:

1. Correct `FRONTEND_ORIGIN` to `https://easybill-ten.vercel.app` if needed.
2. Redeploy Railway.
3. Redeploy Vercel.
4. Run the live authenticated smoke test.
5. Rename the Vercel production hostname and update `FRONTEND_ORIGIN` again.

### 2026-03-22

Summary:

- added backend request tracing so every API response carries an `X-Request-Id` header, exposes it through CORS, and backend error bodies include `request_id`
- updated frontend API error handling so organization, project, BOQ, claim, and certificate failures show status plus request ID when available
- added frontend regression coverage for API error formatting
- fixed the certificate page test to derive the expected issue date from the runtime date instead of a stale hard-coded date
- re-verified frontend `npm test` and `npm run build` after the tracing changes

Completed:

- added backend request tracing in `backend/app/main.py`
- added backend regression coverage scaffold in `backend/tests/test_request_tracing.py`
- added `src/lib/api.test.ts`
- updated frontend error display paths in app bootstrap and create/update flows

Next:

1. Deploy the current backend so the new `X-Request-Id` tracing and CORS header exposure are live in Railway.
2. Retry organization creation from `https://easybill-ten.vercel.app` in an incognito window.
3. If it fails, capture the response body plus the `X-Request-Id` header and find the matching Railway log entry by that same request ID.
4. If it succeeds, continue the live smoke test through certificate issuance.


### 2026-03-21

Summary:

- confirmed the session brief had not been updated to reflect the certificate implementation work already present in the repo
- verified the repo now contains backend certificate routes, schemas, services, and backend regression tests
- verified the frontend now exposes the certificates route, navigation entry, dashboard summary, and issuance screen
- added a minimal Vitest plus Testing Library setup for frontend regression coverage
- added certificate page tests covering claim eligibility, empty-state behavior, and successful issuance submission
- reduced preview instability by changing frontend service-worker cleanup behavior
- improved first-run frontend usability with a mobile workspace selector and clearer certificate states
- diagnosed the reported browser CORS errors as backend `500` failures rather than a true preflight problem
- confirmed Railway could not initially reach the direct Supabase database host because it resolved to an unreachable IPv6 address
- switched production guidance to the Supabase session pooler connection string on port `5432`
- confirmed from Railway startup logs that pooled database connectivity now works and required commercial tables exist
- identified the remaining `POST /api/v1/organizations` failure as a Postgres enum mismatch for `membership_role`
- pushed a backend model fix so SQLAlchemy persists enum values like `OrgAdmin` instead of enum names like `org_admin`

Completed:

- added frontend test tooling and `npm test`
- added `src/pages/Certificates.test.tsx`
- updated the running session brief to reflect the current implementation state
- added backend startup diagnostics for CORS and database readiness
- pushed production fixes to `main` for:
  - preview/service-worker stability
  - backend diagnostics
  - pooled Supabase connection guidance
  - ORM enum persistence compatibility with production Postgres enums

Next:

1. Redeploy Railway from the latest `main` commit containing the enum persistence fix.
2. Retry organization creation from `https://easybill-ten.vercel.app` in an incognito window.
3. If that succeeds, continue immediately through the full commercial smoke test.
4. If it still fails, capture the exact `POST /api/v1/organizations` response and matching Railway log entry.
5. After the live flow works, redeploy or promote the final Vercel production hostname and update `FRONTEND_ORIGIN` one more time.
