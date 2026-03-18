# Setup Runbook

This is the exact order to follow for deployment and first live verification.

Current known state as of 2026-03-17:

- backend service from `backend/` has already been deployed to Railway
- frontend `npm run build` passes locally
- remaining work is environment verification, migration confirmation, and live smoke testing

## 1. Supabase

### Create the project

1. Sign in to Supabase.
2. Create a new project.
3. Choose the region closest to your users.
4. Save the database password somewhere secure.

### Collect the required values

From the Supabase dashboard, collect:

- project URL
- anon key
- service role key
- JWT secret
- pooled Postgres connection string

Put these into:

- [backend/.env.example](/home/user/studio/backend/.env.example)
- your Railway service environment variables
- your Vercel project environment variables

### Database connection choice

Use the pooled Postgres connection string for the API service.

Use it as `DATABASE_URL`.

## 2. GitHub repository

### Commit these backend files

- [backend/pyproject.toml](/home/user/studio/backend/pyproject.toml)
- [backend/requirements.txt](/home/user/studio/backend/requirements.txt)
- [backend/Dockerfile](/home/user/studio/backend/Dockerfile)
- [backend/app/main.py](/home/user/studio/backend/app/main.py)
- [backend/alembic/versions/20260313_000001_initial_schema.py](/home/user/studio/backend/alembic/versions/20260313_000001_initial_schema.py)

Then push to your GitHub repo.

## 3. Railway

### Current expected Railway state

- service root directory is `backend`
- the service is building from the included Dockerfile
- the public URL is reachable
- the latest backend changes have been redeployed

### Add backend environment variables

In Railway, add:

- `APP_ENV=production`
- `DATABASE_URL=<your Supabase pooled Postgres URL>`
- `FRONTEND_ORIGIN=<your Vercel production URL>`
- `SUPABASE_URL=<your Supabase project URL>`
- `SUPABASE_ANON_KEY=<your Supabase anon key>`
- `SUPABASE_SERVICE_ROLE_KEY=<your Supabase service role key>`
- `SUPABASE_JWT_SECRET=<your Supabase JWT secret>`

Optional:

- `SENTRY_DSN=<your backend Sentry DSN>`

### Configure health check

Use:

- path: `/healthz`

### Configure the public URL

After the deploy succeeds:

1. Copy the Railway generated domain.
2. Later replace it with your API custom domain if you want.

### Redeploy checklist

Before running live smoke tests:

1. Confirm the service shows a successful deploy for the latest commit you expect.
2. Open `https://<your-railway-domain>/healthz`.
3. Confirm the health endpoint responds before testing authenticated routes.

## 4. Run the first migration

From your own machine, inside the `backend` directory:

1. create a Python 3.11 virtual environment
2. install dependencies from `requirements.txt`
3. export the same `DATABASE_URL` used in Railway
4. run:

```bash
alembic upgrade head
```

This creates the initial schema in Supabase.

## 5. Vercel frontend

### Add frontend environment variables

In Vercel, add:

- `VITE_API_BASE_URL=https://<your-railway-domain>`
- `VITE_SUPABASE_URL=<your Supabase project URL>`
- `VITE_SUPABASE_ANON_KEY=<your Supabase anon key>`

Temporary compatibility:

- if you already have `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set from an older setup, the frontend will still read them
- move them to the `VITE_` names anyway so the deployment matches the actual Vite stack

Also set the Vercel build/output settings for Vite:

- build command: `npm run build`
- output directory: `dist`

Then redeploy the frontend.

## 6. First API smoke test

Use the access token from a logged-in Supabase user and call:

### Health check

```bash
curl https://<your-railway-domain>/healthz
```

### Create organization

```bash
curl -X POST https://<your-railway-domain>/api/v1/organizations \
  -H "Authorization: Bearer <supabase-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme QS","slug":"acme-qs"}'
```

### List organizations

```bash
curl https://<your-railway-domain>/api/v1/organizations \
  -H "Authorization: Bearer <supabase-access-token>"
```

### Create project

Use the organization ID from the previous response:

```bash
curl -X POST https://<your-railway-domain>/api/v1/projects \
  -H "Authorization: Bearer <supabase-access-token>" \
  -H "X-Organization-Id: <organization-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id":"<organization-id>",
    "code":"PRJ-001",
    "name":"The Willows Estate",
    "description":"Residential development",
    "client_name":"Willows Devco",
    "currency_code":"ZAR",
    "retention_percent_default":"10.00",
    "tax_percent_default":"15.00"
  }'
```

### Create contract

```bash
curl -X POST https://<your-railway-domain>/api/v1/contracts \
  -H "Authorization: Bearer <supabase-access-token>" \
  -H "X-Organization-Id: <organization-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id":"<organization-id>",
    "project_id":"<project-id>",
    "code":"SUB-001",
    "title":"Groundworks Package",
    "currency_code":"ZAR",
    "retention_percent":"10.00",
    "retention_cap_percent":"5.00",
    "tax_percent":"15.00"
  }'
```

### Create BOQ revision

```bash
curl -X POST https://<your-railway-domain>/api/v1/boq-revisions \
  -H "Authorization: Bearer <supabase-access-token>" \
  -H "X-Organization-Id: <organization-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id":"<organization-id>",
    "project_id":"<project-id>",
    "contract_id":"<contract-id>",
    "revision_number":1,
    "items":[
      {
        "item_code":"EARTH-001",
        "trade_code":"EARTH",
        "description":"Bulk excavation in normal earth",
        "unit":"m3",
        "contract_quantity":"2500.0000",
        "rate":"120.0000",
        "order_index":1
      }
    ]
  }'
```

### Create claim batch

Use the BOQ item ID returned from the BOQ revision response:

```bash
curl -X POST https://<your-railway-domain>/api/v1/claims \
  -H "Authorization: Bearer <supabase-access-token>" \
  -H "X-Organization-Id: <organization-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id":"<organization-id>",
    "project_id":"<project-id>",
    "contract_id":"<contract-id>",
    "period_number":1,
    "remarks":"Initial valuation period",
    "lines":[
      {
        "boq_item_id":"<boq-item-id>",
        "previous_certified_quantity":"0.0000",
        "claimed_quantity_this_period":"125.0000",
        "claimed_materials_on_site_value":"0.00",
        "notes":"First period measured work"
      }
    ]
  }'
```

### Update claim status

```bash
curl -X PATCH https://<your-railway-domain>/api/v1/claims/<claim-batch-id>/status \
  -H "Authorization: Bearer <supabase-access-token>" \
  -H "X-Organization-Id: <organization-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"Submitted",
    "remarks":"Submitted for review"
  }'
```

Valid status values currently include:

- `Draft`
- `Submitted`
- `UnderReview`
- `Approved`
- `Rejected`
- `Certified`
- `Paid`

### List claims

```bash
curl https://<your-railway-domain>/api/v1/claims \
  -H "Authorization: Bearer <supabase-access-token>" \
  -H "X-Organization-Id: <organization-id>"
```

## 7. What to do if it crashes

### If Railway fails during build

- confirm the service root directory is `backend`
- confirm Railway is using the included Dockerfile
- confirm all environment variables are set

### If the API starts but requests fail with 401

- confirm the Supabase access token is real and not expired
- confirm `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct in Railway

### If requests fail with 403

- create the organization first
- use the returned organization ID in the `X-Organization-Id` header

### If requests fail with database errors

- confirm Alembic migration ran successfully against Supabase
- confirm `DATABASE_URL` uses the pooled Postgres URL

### If frontend requests fail from Vercel

- confirm `VITE_API_BASE_URL` points to the Railway public origin with no trailing slash mismatch concerns
- inspect browser devtools `Network` for the failing request URL, response body, and response status
- confirm the browser is sending both `Authorization: Bearer <token>` and `X-Organization-Id`

### If claims fail specifically

- confirm the selected contract already has at least one BOQ revision
- confirm the claim line `boq_item_id` belongs to the selected contract and organization
- confirm the period number does not already exist for that contract
