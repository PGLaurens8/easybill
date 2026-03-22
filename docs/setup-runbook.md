# Setup Runbook

This is the exact order to follow for deployment and first live verification.

Current known state as of 2026-03-22:

- backend service from `backend/` is live on Railway at `https://quanteasy.up.railway.app`
- Railway health endpoint is confirmed OK at `https://quanteasy.up.railway.app/healthz`
- the current feature branch is `feature/org-membership-management`
- the feature branch has already been verified locally with backend tests, frontend tests, and a frontend production build
- the branch adds membership management, project/materials/dashboard page completion, project-context workflow links, and legacy project cleanup
- Vercel production currently uses `https://easybill-ten.vercel.app`
- generated `dist/` output remains intentionally uncommitted local churn

## 1. Branch And Merge State

Current feature branch commits to carry forward:

1. `f31f6cc Add organization membership management`
2. `139103c Populate project and materials pages`
3. `39e998b Add project-context workflow links`
4. `8e50be6 Polish dashboard workflow actions`
5. `add7711 Remove unused legacy project scaffold`

Before production verification, either:

- deploy this feature branch directly in preview/staging, or
- merge this branch and deploy the merged target branch

Do not rely on older `main` assumptions from earlier notes without confirming these commits are present in the deployed build.

## 2. Local Verification Baseline

These checks already passed locally and are the current known-good baseline:

```bash
cd /home/user/studio/backend
./.venv/bin/pytest tests/test_request_tracing.py tests/test_claim_rules.py tests/test_claim_db.py tests/test_certificate_db.py tests/test_organization_db.py tests/test_organization_routes.py -q

cd /home/user/studio
npm test
npm run build
```

## 3. Railway

### Confirm backend settings

Railway should have:

- `APP_ENV=production`
- `DATABASE_URL=<your Supabase session pooler Postgres URL>`
- `FRONTEND_ORIGIN=https://easybill-ten.vercel.app`
- `SUPABASE_URL=<your Supabase project URL>`
- `SUPABASE_ANON_KEY=<your Supabase anon key>`
- `SUPABASE_SERVICE_ROLE_KEY=<your Supabase service role key>`
- `SUPABASE_JWT_SECRET=<your Supabase JWT secret>`

Important:

- `FRONTEND_ORIGIN` must include the full origin with scheme
- `DATABASE_URL` should use the Supabase session pooler on port `5432`, not the direct IPv6-only host
- expected SQLAlchemy format:

```text
postgresql+psycopg://postgres.<project_ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres
```

### Deploy checklist

1. Confirm Railway is deploying code that includes the five feature-branch commits above.
2. Trigger a deploy.
3. Confirm `https://quanteasy.up.railway.app/healthz` still responds.
4. In Railway logs, confirm startup still reports:
   - `frontend_origins` include `https://easybill-ten.vercel.app`
   - `database_ok: true`
   - `has_organizations_table: true`
   - `has_memberships_table: true`
5. Keep Railway logs open for the smoke test so `X-Request-Id` values can be matched quickly.

## 4. Vercel

### Current production URL

- `https://easybill-ten.vercel.app`

### Required frontend env vars

- `VITE_API_BASE_URL=https://quanteasy.up.railway.app`
- `VITE_SUPABASE_URL=<your Supabase project URL>`
- `VITE_SUPABASE_ANON_KEY=<your Supabase anon key>`

### Deploy checklist

1. Confirm the deployed frontend includes:
   - settings membership management
   - `/projects/:projectId`
   - live materials page
   - dashboard workflow actions
2. Redeploy Vercel if needed.
3. Test the production URL in an incognito window.

## 5. Live Smoke Test

Run this exact production flow after Railway and Vercel are both on the current code:

1. Open `https://easybill-ten.vercel.app`
2. Log in with a valid Supabase user.
3. Create an organization.
4. Open Settings and:
   - list memberships
   - add a member by user UUID if you have one available
   - update a member role if appropriate
5. Create a project.
6. Open the project detail page.
7. Follow the project-context links into BOQ, Claims, and Certificates.
8. Create a contract.
9. Create a BOQ revision.
10. Create a claim batch.
11. Approve the claim.
12. Issue a payment certificate.
13. Confirm the new certificate appears in the issued list.
14. Return to the dashboard and confirm the quick actions and summary cards reflect the new state.

If anything fails:

- capture the exact browser console error
- capture the failing network request URL, method, status, and response body
- capture the backend `X-Request-Id` response header or `request_id` body field
- match that request ID in Railway logs
- note whether the failure is in org setup, membership management, project navigation, or commercial flow execution

## 6. After Smoke Test

If the smoke test passes:

1. merge `feature/org-membership-management`
2. rename the Vercel production hostname from `easybill-ten` to a `quanteasy` name
3. update Railway `FRONTEND_ORIGIN` to that final hostname
4. redeploy Railway
5. rerun a short authenticated smoke test

## 7. Recommended Next Implementation Pass

These are the best lean follow-ups after merge:

1. add a lightweight documented smoke-test checklist page or ops note inside the app or docs
2. add targeted frontend tests for dashboard navigation and project detail workflow links
3. improve remaining empty/loading states on the heaviest commercial pages
4. settle the repo policy for generated `dist/` output so local worktrees stay clean
