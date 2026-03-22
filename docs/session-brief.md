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

### Verified

- backend tests passed locally with a Python 3.12 virtualenv:
  - `./.venv/bin/pytest tests/test_request_tracing.py tests/test_claim_rules.py tests/test_claim_db.py tests/test_certificate_db.py tests/test_organization_db.py tests/test_organization_routes.py -q`
- frontend tests passed locally:
  - `npm test`
- frontend production build passed locally:
  - `npm run build`
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

Important local note:

- generated `dist/` output is still dirty in the worktree and was intentionally left out of every commit

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

Current local frontend state:

- membership UI is present in settings
- routed project workspace is present
- materials page is live and data-backed
- dashboard is aligned with the current workflow

## Current Blockers / Risks

- live authenticated end-to-end smoke testing is still outstanding
- the new membership routes and tighter org/header authorization are locally verified but not yet confirmed against production Railway and Vercel
- the current production hostname still uses `easybill-ten` instead of a `quanteasy` name
- generated `dist/` churn continues to create local noise and should not be committed unless the deployment strategy explicitly requires it

## Exact Next Steps

### Required next

1. Deploy the current backend and frontend from the latest branch or merged target branch.
2. Run a live authenticated smoke test on `https://easybill-ten.vercel.app`.
3. Verify this exact flow in production:
   - create organization
   - manage membership from Settings
   - create project
   - create contract
   - create BOQ revision
   - create and approve claim
   - issue certificate
4. If anything fails, capture the browser network response plus the backend `X-Request-Id` and match it in Railway logs.

### After the live smoke test

1. Merge `feature/org-membership-management` once reviewed.
2. Rename the production Vercel hostname to a `quanteasy` domain and update `FRONTEND_ORIGIN` accordingly.
3. Decide whether `dist/` should be ignored, regenerated locally only, or committed as part of deployment artifacts.

### Next implementation candidates

These are not required before merge, but they are the best lean follow-ups:

1. add deeper project-context linking so BOQ, claims, and certificates preserve more state across navigation
2. add a small live smoke-test checklist page or internal admin checklist to make production validation repeatable
3. tighten frontend empty and loading states on the remaining data-heavy pages
4. add targeted frontend tests for dashboard navigation and project detail actions

## Session Log

### 2026-03-22

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
