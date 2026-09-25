# Setup Runbook

This is the exact order to follow for deployment and first live verification.

Current known state as of 2026-03-22:

- backend service from `backend/` is live on Railway at `https://quanteasy.up.railway.app`
- Railway health endpoint is confirmed OK at `https://quanteasy.up.railway.app/healthz`
- frontend certificate flow and frontend regression tests are now present locally
- Vercel production currently uses `https://easybill-ten.vercel.app`
- Railway startup logs now confirm:
  - `frontend_origins` include `https://easybill-ten.vercel.app`
  - database connectivity is OK
  - `organizations` and `memberships` tables both exist
- the earlier direct Supabase database connection issue has been replaced with a pooled session connection that works from Railway
- an enum persistence fix for organization membership creation has been pushed to `main` and now needs live request-path verification after redeploy
- backend responses now include an `X-Request-Id` header, expose it through CORS, and include `request_id` in error bodies for faster Railway log matching

## 1. Railway

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
- correct value: `https://easybill-ten.vercel.app`
- incorrect value: `easybill-ten.vercel.app`
- `DATABASE_URL` should use the Supabase session pooler on port `5432`, not the direct IPv6-only host
- expected SQLAlchemy format:

```text
postgresql+psycopg://postgres.<project_ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres
```

### Redeploy checklist

1. Save the exact `FRONTEND_ORIGIN` value.
2. Save the pooled `DATABASE_URL` value if it changed.
3. Trigger a Railway redeploy.
4. Confirm `https://quanteasy.up.railway.app/healthz` still responds.
5. In Railway logs, confirm the `application_startup` log shows the expected `frontend_origins` and `frontend_origin_regex` values.
6. In Railway logs, confirm `database_startup_check` reports:
   - `database_ok: true`
   - `has_organizations_table: true`
   - `has_memberships_table: true`
7. After startup is green, perform a live `POST /api/v1/organizations` from the frontend.
8. If organization creation still fails, inspect the matching `database_request_failed` log entry.

### Current production fix plan

Use this exact order for the remaining production issue:

1. Ensure Railway is deployed from the latest `main` that includes the enum persistence fix.
2. Open `https://easybill-ten.vercel.app` in an incognito window.
3. Log in with a valid Supabase user.
4. Attempt to create an organization.
5. If the request succeeds, continue immediately to project creation and the rest of the smoke test.
6. If the request fails, capture:
   - browser network entry for `POST /api/v1/organizations`
   - response status and body
   - `X-Request-Id` response header or `request_id` field from the JSON body
   - matching Railway log entry for the same timestamp

Why this is the right next step:

- CORS preflight is already confirmed working.
- Supabase auth lookup is already confirmed working.
- Railway startup now confirms database access and required tables.
- the last confirmed failing path was enum serialization during membership insert, and that fix is already in the codebase.

### Interpreting browser errors

- If the `OPTIONS` request returns `200 OK` with `access-control-allow-origin`, CORS preflight is working.
- If the follow-up `GET` or `POST` then returns `500`, the real problem is backend execution, not CORS configuration.
- When that happens, inspect Railway logs for the matching timestamp and prefer the app-level `X-Request-Id` value now returned by the backend.
- If Railway startup shows `database_ok: true` and the required tables exist, the remaining problem is in the request path rather than connectivity or migrations.
- If Postgres rejects an enum value such as `org_admin`, the backend is writing enum names instead of database enum values and the fix must come from the ORM model definitions.

## 2. Vercel

### Current production URL

- `https://easybill-ten.vercel.app`

### Required frontend env vars

- `VITE_API_BASE_URL=https://quanteasy.up.railway.app`
- `VITE_SUPABASE_URL=<your Supabase project URL>`
- `VITE_SUPABASE_ANON_KEY=<your Supabase anon key>`

Optional demo access (shows a "Try the demo" button on the login screen):

- `VITE_DEMO_EMAIL=<dedicated demo user email>`
- `VITE_DEMO_PASSWORD=<that user's password>`

These values are visible in the browser bundle, so use a dedicated demo user in Supabase, never a real account.
The demo user sees whatever workspaces they are a member of: create a demo workspace while signed in as them,
or add them to one from the Team page.

### Build settings

- build command: `npm run build`
- output directory: `dist`

### Redeploy checklist

1. Confirm the env vars above are saved.
2. Redeploy Vercel.
3. Test the production URL in an incognito window.

## 3. Migration

Confirmed complete on 2026-03-18:

```bash
cd backend
alembic upgrade head
```

## 4. Smoke Test

After Railway and Vercel have both been redeployed:

1. Open `https://easybill-ten.vercel.app`
2. Log in with a Supabase user.
3. Create an organization.
4. Create a project.
5. Create a contract.
6. Create a BOQ revision.
7. Create a claim batch.
8. Approve the claim.
9. Open Certificates.
10. Issue a payment certificate.
11. Confirm the new certificate appears in the issued list.

If anything fails:

- capture the exact browser console error
- capture the failing network request URL/status
- capture the request headers and response headers
- note whether the error is on login, bootstrap load, or a create action
- copy the backend `X-Request-Id` value and the matching Railway request ID if present

## 5. Rename Production URL

You want to change the Vercel hostname from `easybill-ten` to `quanteasy`.

After the app is working on the current production URL:

1. Add or promote a `quanteasy...vercel.app` domain in Vercel as the production domain.
2. Make that new hostname the primary production URL.
3. Update Railway `FRONTEND_ORIGIN` to the new `https://...` value.
4. Redeploy Railway again.
5. Retest login and authenticated API calls.
