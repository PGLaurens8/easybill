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

- Next.js on Vercel

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
- first authenticated API slice implemented

### Verified

- frontend `npm run typecheck` passes
- frontend `npm run build` passes

### Not yet verified in this environment

- Python backend runtime
- Alembic migration execution against Supabase
- Railway deployment

Reason:

- current environment does not have `python` or `python3` available on PATH

## Current Blockers / Risks

- Supabase project credentials have not yet been wired into deployment
- initial Alembic migration has not yet been run against Supabase
- frontend is still using mock data instead of the FastAPI API
- Supabase auth is not yet integrated into the Next.js frontend

## Exact Next Steps

1. Create/configure Supabase project and collect credentials.
2. Deploy backend from `backend/` to Railway.
3. Run `alembic upgrade head` against Supabase.
4. Add Vercel env vars for Supabase and API base URL.
5. Smoke test organization, project, contract, and BOQ revision endpoints.
6. Replace frontend mock auth with Supabase auth.
7. Replace frontend mock project/contract/BOQ flows with real API calls.
8. Implement claims and certificates API next.

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
