# Setup Runbook

This is the exact order to follow for deployment and first live verification.

Current known state as of 2026-03-18:

- backend service from `backend/` is live on Railway at `https://quanteasy.up.railway.app`
- Railway health endpoint is confirmed OK at `https://quanteasy.up.railway.app/healthz`
- frontend startup resilience fix has been pushed to GitHub
- Vercel frontend env vars are reported set
- Railway backend env vars are reported set
- production migration has been run
- Vercel production currently uses `https://easybill-ten.vercel.app`

## 1. Railway

### Confirm backend settings

Railway should have:

- `APP_ENV=production`
- `DATABASE_URL=<your Supabase pooled Postgres URL>`
- `FRONTEND_ORIGIN=https://easybill-ten.vercel.app`
- `SUPABASE_URL=<your Supabase project URL>`
- `SUPABASE_ANON_KEY=<your Supabase anon key>`
- `SUPABASE_SERVICE_ROLE_KEY=<your Supabase service role key>`
- `SUPABASE_JWT_SECRET=<your Supabase JWT secret>`

Important:

- `FRONTEND_ORIGIN` must include the full origin with scheme
- correct value: `https://easybill-ten.vercel.app`
- incorrect value: `easybill-ten.vercel.app`

### Redeploy checklist

1. Save the exact `FRONTEND_ORIGIN` value.
2. Trigger a Railway redeploy.
3. Confirm `https://quanteasy.up.railway.app/healthz` still responds.

## 2. Vercel

### Current production URL

- `https://easybill-ten.vercel.app`

### Required frontend env vars

- `VITE_API_BASE_URL=https://quanteasy.up.railway.app`
- `VITE_SUPABASE_URL=<your Supabase project URL>`
- `VITE_SUPABASE_ANON_KEY=<your Supabase anon key>`

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

If anything fails:

- capture the exact browser console error
- capture the failing network request URL/status
- note whether the error is on login, bootstrap load, or a create action

## 5. Rename Production URL

You want to change the Vercel hostname from `easybill-ten` to `quanteasy`.

After the app is working on the current production URL:

1. Add or promote a `quanteasy...vercel.app` domain in Vercel as the production domain.
2. Make that new hostname the primary production URL.
3. Update Railway `FRONTEND_ORIGIN` to the new `https://...` value.
4. Redeploy Railway again.
5. Retest login and authenticated API calls.
