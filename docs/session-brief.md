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

### Verified

- frontend `npm run build` passes
- Railway health endpoint responds at `https://quanteasy.up.railway.app/healthz`
- Railway API base URL is `https://quanteasy.up.railway.app`
- branch is pushed successfully to `origin/main`

### Deployment State

#### Railway

- public API URL: `https://quanteasy.up.railway.app`
- health endpoint: `https://quanteasy.up.railway.app/healthz`
- health status: confirmed OK on 2026-03-18
- required backend env vars reported present
- `FRONTEND_ORIGIN` has been added by the user
- important: `FRONTEND_ORIGIN` must include the scheme and should be `https://easybill-ten.vercel.app`

#### Vercel

Known frontend URLs shared by the user:

- `https://easybill-ten.vercel.app`
- `https://quanteasy-pg-laurens-projects.vercel.app`
- `https://quanteasy-git-main-pg-laurens-projects.vercel.app`
- `https://quanteasy-zwnf19lnq-pg-laurens-projects.vercel.app`

Current confirmed production hostname:

- `https://easybill-ten.vercel.app`

## Current Blockers / Risks

- `FRONTEND_ORIGIN` may be misconfigured if it was saved as `easybill-ten.vercel.app` without `https://`
- Railway must be redeployed after the `FRONTEND_ORIGIN` correction
- Vercel should be redeployed after the latest environment updates
- live authenticated end-to-end smoke testing is still outstanding
- later, the Vercel production hostname should be renamed from `easybill-ten` to a `quanteasy` name to match the product

## Exact Next Steps

1. In Railway, confirm `FRONTEND_ORIGIN` is exactly `https://easybill-ten.vercel.app`.
2. Redeploy Railway.
3. Redeploy Vercel.
4. Run the live authenticated smoke test: login, create organization, create project, create contract, create BOQ revision, create claim.
5. If any page still fails, capture the exact browser console error and failing network request.
6. Rename the Vercel production domain from `easybill-ten.vercel.app` to a `quanteasy` hostname, then update `FRONTEND_ORIGIN` again.

## Session Log

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
