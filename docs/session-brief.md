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
- organization membership and workspace access control

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

- backend request tracing is implemented so every API response can expose an `X-Request-Id`
- frontend API error handling now surfaces HTTP status plus request IDs when available
- backend organization membership list, create, and role-update flows are implemented
- backend organization membership authorization now rejects requests where the route `organization_id` and `X-Organization-Id` header do not match
- frontend settings page now supports organization member viewing, invite-by-user-id, and role updates for org admins
- project detail is now a real routed workspace page at `/projects/:projectId`
- materials is now a live BOQ-derived reference page instead of a placeholder
- project detail now links directly into BOQ, claims, and certificates with project preselection
- dashboard quick actions now surface the next workflow step and live summary cards link into active pages
- legacy unused project scaffolding has been removed from the frontend
- project creation now guards against duplicate in-flight submits and refreshes the project list after a `409 Conflict`
- targeted frontend regression tests now cover dashboard workflow navigation and project-detail workflow links

### Verified

- backend tests passed locally with a Python 3.12 virtualenv:
  - `./.venv/bin/pytest tests/test_request_tracing.py tests/test_claim_rules.py tests/test_claim_db.py tests/test_certificate_db.py tests/test_organization_db.py tests/test_organization_routes.py -q`
- frontend tests previously passed locally:
  - `npm test`
- frontend production build previously passed locally:
  - `npm run build`
- focused regression tests for the project creation fix passed locally:
  - `npm test -- --run src/pages/Projects.test.tsx src/lib/api.test.ts`
- focused navigation regression tests passed locally:
  - `npm test -- --run src/pages/Dashboard.test.tsx src/pages/ProjectDetail.test.tsx src/pages/Projects.test.tsx`
  - `npm test -- --run src/pages/ProjectDetail.test.tsx src/pages/Projects.test.tsx src/pages/BOQBuilder.test.tsx src/pages/Certificates.test.tsx`
- local source tracing for the preview-only `/projec` symptom found no in-repo slash-command parser, matching error string, global keyboard command handler, or injected runtime helper in the frontend app shell
- preview smoke test produced one reproducible backend conflict on project creation and one separate unresolved command-parsing issue:
  - preview hostname: `quanteasy-git-feature-org-membership-11b1c6-pg-laurens-projects.vercel.app`
  - backend response observed: `POST https://quanteasy.up.railway.app/api/v1/projects` returned `409 Conflict` for project code `oib89`
  - separate frontend/runtime symptom observed: `unrecognized command '/projec'`
- feature branch pushed successfully:
  - `feature/org-membership-management`

### Current Branch State

Active branch:

- `feature/org-membership-management`

Pushed commits on this branch from this workstream:

1. `f31f6cc Add organization membership management`
2. `139103c Populate project and materials pages`
3. `39e998b Add project-context workflow links`
4. `8e50be6 Polish dashboard workflow actions`
5. `add7711 Remove unused legacy project scaffold`
6. `547cb27 Fix duplicate project submits`

Important local note:

- current local worktree changes are:
  - new `src/pages/ProjectDetail.test.tsx`
  - new `src/pages/Dashboard.test.tsx`
- generated `dist/` output is no longer the active local noise source for this session

### Deployment State

#### Railway

- public API URL: `https://quanteasy.up.railway.app`
- health endpoint: `https://quanteasy.up.railway.app/healthz`
- backend startup diagnostics previously confirmed:
  - `frontend_origins` include `https://easybill-ten.vercel.app`
  - pooled database connectivity is working
  - `organizations` and `memberships` tables exist
- latest local backend membership and request-tracing changes are verified in tests but still need live production confirmation after deploy

#### Vercel

Current confirmed production hostname:

- `https://easybill-ten.vercel.app`

Current preview hostname used in the latest smoke pass:

- `https://quanteasy-git-feature-org-membership-11b1c6-pg-laurens-projects.vercel.app`

Current local frontend state:

- membership UI is present in settings
- routed project workspace is present
- materials page is live and data-backed
- dashboard is aligned with the current workflow
- project creation has an in-flight submit guard plus regression coverage
- dashboard and project-detail workflow entry points now have targeted regression coverage

## Current Blockers / Risks

- live authenticated end-to-end smoke testing is still only partially completed
- preview smoke testing showed project creation can still surface a `409 Conflict` when the same project code is submitted twice or the first create succeeds before the UI reflects it; the local frontend mitigation is implemented but not yet redeployed and rechecked live
- the separate `unrecognized command '/projec'` symptom remains unresolved, but local repo tracing found no matching parser or handler in the app code, so the failure now looks more likely to be preview-runtime-, browser-, or environment-specific
- the new membership routes and tighter org/header authorization are locally verified but not yet fully confirmed against the latest deployed Railway and Vercel code level
- the current production hostname still uses `easybill-ten` instead of a `quanteasy` name

## Exact Next Steps

### Required next

1. Deploy the current frontend branch state so the project creation duplicate-submit fix is live.
2. Re-run the smoke test on the preview deployment `https://quanteasy-git-feature-org-membership-11b1c6-pg-laurens-projects.vercel.app` or the refreshed replacement preview if Vercel has issued a new URL.
3. Re-test project creation first with a fresh code and watch for duplicate network requests:
   - confirm only one `POST /api/v1/projects` fires per submit
   - confirm the new project appears immediately after success
   - if a `409` still appears, capture the response body and whether the project was actually created on the first request
4. If `unrecognized command '/projec'` appears again, capture the exact UI action that triggered it plus the adjacent browser console lines or stack, because local code search found no in-repo slash-command parser to fix.
5. After project creation is confirmed stable, continue the full authenticated workflow:
   - create organization if needed
   - manage membership from Settings
   - create project
   - create contract
   - create BOQ revision
   - create and approve claim
   - issue certificate
6. If anything fails, capture the browser network response plus the backend `X-Request-Id` and match it in Railway logs.

### After the live smoke test

1. Merge `feature/org-membership-management` once reviewed.
2. Rename the production Vercel hostname to a `quanteasy` domain and update `FRONTEND_ORIGIN` accordingly.
3. Decide whether any remaining generated-artifact churn needs additional cleanup beyond the existing `dist` tracking change.

### Next implementation candidates

These are not required before merge, but they are the best lean follow-ups:

1. add deeper project-context linking so BOQ, claims, and certificates preserve more state across navigation
2. add a small live smoke-test checklist page or internal admin checklist to make production validation repeatable
3. tighten frontend empty and loading states on the remaining data-heavy pages
4. add broader targeted frontend tests for remaining workflow transitions beyond the new dashboard and project-detail coverage

## Session Log

### 2026-03-23

Summary:

- traced the preview-only `unrecognized command '/projec'` symptom through the local repo and found no matching error string, slash-command parser, global keyboard command handler, or injected runtime helper in the frontend app shell
- confirmed the duplicate project-submit mitigation is present locally in commit `547cb27`
- added `src/pages/ProjectDetail.test.tsx` to lock down project workspace workflow links and the missing-organization redirect path
- added `src/pages/Dashboard.test.tsx` to lock down setup quick actions and summary-card navigation targets
- verified the focused navigation regression slice passed locally
- updated the running session brief so the next handoff is explicit that the remaining `/projec` symptom likely needs live preview capture rather than more blind local tracing

Completed:

- frontend:
  - added `src/pages/ProjectDetail.test.tsx`
  - added `src/pages/Dashboard.test.tsx`
- investigation:
  - searched `src/` and `backend/` for command parsing, slash-command handling, keyboard handlers, and injected runtime hooks
  - confirmed routing and project-context links are plain `react-router-dom` navigation
- verification:
  - `npm test -- --run src/pages/Dashboard.test.tsx src/pages/ProjectDetail.test.tsx src/pages/Projects.test.tsx` passed
  - `npm test -- --run src/pages/ProjectDetail.test.tsx src/pages/Projects.test.tsx src/pages/BOQBuilder.test.tsx src/pages/Certificates.test.tsx` passed

Next:

1. deploy the current frontend branch state to preview or production-equivalent
2. retry project creation with a fresh project code and confirm only one POST fires
3. if `/projec` reproduces, capture the exact click path and browser console stack or adjacent console lines
4. continue the remaining authenticated commercial smoke flow once the project step is stable

### 2026-03-22

Update 2:

- processed a quick preview smoke test result for project creation on the Vercel preview deployment
- confirmed the backend `409 Conflict` is consistent with the project code uniqueness rule in `backend/app/services/commercial.py`
- traced the frontend create-project flow and found it only disabled the button after render, without a true re-entry guard in the submit handler
- patched `src/pages/Projects.tsx` so duplicate in-flight submit events are ignored and a `409` triggers `refreshProjects()` before the error is surfaced
- added `src/pages/Projects.test.tsx` with regression coverage for duplicate-submit suppression and the refresh-on-conflict path
- verified the focused frontend regression slice passed locally
- left one follow-up open: the separate preview symptom `unrecognized command '/projec'` still needs investigation

Completed:

- frontend:
  - added an in-flight submit lock to the create-project form
  - refreshed the project list automatically when create-project receives `409 Conflict`
  - added targeted regression coverage in `src/pages/Projects.test.tsx`
- verification:
  - `npm test -- --run src/pages/Projects.test.tsx src/lib/api.test.ts` passed

Next:

1. deploy the create-project fix to the active preview or a new preview deployment
2. retry project creation with a fresh project code and confirm only one POST fires
3. inspect the source of `unrecognized command '/projec'`
4. continue the remaining live commercial smoke flow once the project step is stable

Summary:

- verified and completed the organization membership slice across backend and frontend
- added route hardening so organization path parameters and `X-Organization-Id` headers must match for membership endpoints
- expanded backend tests for membership services and routes
- set up a local Python 3.12 virtualenv and ran the backend verification slice successfully
- continued with a lean frontend pass across project detail, materials, dashboard, and project-context workflow navigation
- removed unused legacy project page scaffolding that was no longer routed or imported
- pushed five feature-branch commits covering membership management, page population, workflow links, dashboard polish, and legacy cleanup

Completed:

- backend:
  - hardened org membership authorization in `backend/app/api/deps/auth.py`
  - completed membership routes and schemas
  - expanded `tests/test_organization_db.py`
  - expanded `tests/test_organization_routes.py`
- frontend:
  - completed settings membership management flow
  - routed and populated `src/pages/ProjectDetail.tsx`
  - replaced the materials placeholder with a BOQ-derived reference view
  - added project-context deep links into BOQ, claims, and certificates
  - polished `src/pages/Dashboard.tsx`
  - removed `src/pages/ProjectPage.tsx` and its unused helper/types files
- verification:
  - backend pytest slice passed
  - `npm test` passed
  - `npm run build` passed

Next:

1. deploy the latest code to Railway and Vercel
2. run the live authenticated smoke test end to end
3. merge the feature branch after review
4. clean up the long-term `dist/` policy so the worktree stays stable

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
