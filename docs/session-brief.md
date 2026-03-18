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

## Current Backend Scope

Implemented foundation:

- FastAPI app bootstrap
- CORS and config
- Supabase token validation
- organization membership authorization
- initial commercial schema
- CRUD foundation for:
  - organizations
  - projects
  - contracts
  - BOQ revisions
- claims

## Key Files

- Architecture: [backend-architecture.md](/home/user/studio/docs/backend-architecture.md)
- Deployment: [deployment-stack.md](/home/user/studio/docs/deployment-stack.md)
- Setup steps: [setup-runbook.md](/home/user/studio/docs/setup-runbook.md)
- Backend app: [backend/app/main.py](/home/user/studio/backend/app/main.py)
- Auth dependency: [backend/app/api/deps/auth.py](/home/user/studio/backend/app/api/deps/auth.py)
- Commercial service: [backend/app/services/commercial.py](/home/user/studio/backend/app/services/commercial.py)
- Initial migration: [backend/alembic/versions/20260313_000001_initial_schema.py](/home/user/studio/backend/alembic/versions/20260313_000001_initial_schema.py)

## Current Status

### Completed

- Frontend commercial calculation/domain cleanup
- shared calculation layer added
- backend architecture document added
- deployment recommendation documented
- FastAPI backend scaffold created
- Alembic initial schema created
- Supabase auth integrated into the Vite frontend
- frontend organization, project, BOQ, and claims flows wired to the FastAPI API
- claims API slice implemented end to end

### Verified

- frontend `npm run build` passes

### Not yet verified in this environment

- Python backend runtime
- Alembic migration execution against Supabase
- live end-to-end API/runtime smoke test

Reason:

- current environment does not have `python` or `python3` available on PATH

## Current Blockers / Risks

- Railway is deployed, but the currently live version still needs end-to-end verification against the latest expected backend behavior
- initial Alembic migration still needs to be confirmed against the target Supabase database
- live claim lifecycle and export flows are coded but not yet smoke tested against deployed services
- current environment still has no `python` or `python3` on `PATH`, so backend runtime checks cannot be executed locally here

## Exact Next Steps

1. Confirm the live Railway deployment is the expected backend revision and that `/healthz` is healthy.
2. Verify organization, project, contract, and BOQ revision records exist and load correctly.
3. Test the claim lifecycle end to end against the deployed API.
4. Check export flows after the live data path is confirmed.
5. Capture any exact backend or network error from Railway/browser devtools if runtime issues appear.

## Session Log

### 2026-03-13

Summary:

- audited the frontend-heavy prototype and identified major domain and backend risks
- added commercial calculation logic and a backend architecture plan
- corrected prototype issues so the current frontend builds cleanly
- scaffolded the FastAPI backend and initial migration
- implemented the first API slice with Supabase-authenticated organization and commercial setup routes
- added deployment and setup runbooks

Stopped at:

- backend scaffold complete
- awaiting Supabase credentials, migration run, and Railway deployment

Recommended next session start:

- execute [setup-runbook.md](/home/user/studio/docs/setup-runbook.md) linearly
- then wire frontend auth and project setup screens to the backend

### 2026-03-17

Summary:

- verified the frontend still builds after the Supabase and API integration work
- confirmed claims flow is implemented across frontend and backend
- reconciled the session brief with the actual worktree state

Completed:

- frontend `npm run build` passes with the current integration changes
- Supabase auth context and protected routes are in place
- claims routes, schemas, service logic, and UI wiring are present

Blocked by:

- live runtime smoke testing still needs to be performed outside this environment
- backend runtime verification here is blocked because `python` is not installed on `PATH`

Next:

1. Confirm `/healthz` and the current live Railway deploy.
2. Verify org, project, contract, and BOQ revision data exists end to end.
3. Test claim lifecycle end to end.
4. Check exports.
5. Capture exact backend or network errors if anything fails.

## Update Template

Copy this section for the next session:

### YYYY-MM-DD

Summary:

- 

Completed:

- 

Blocked by:

- 

Next:

1. 
2. 
3. 
