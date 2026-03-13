# Setup Runbook

This is the exact order to follow.

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

### Create the API service

1. In Railway, create a new project.
2. Choose `Deploy from GitHub repo`.
3. Select this repository.
4. Set the service root directory to `backend`.
5. Let Railway build from the included Dockerfile.

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

- `NEXT_PUBLIC_API_BASE_URL=https://<your-railway-domain>`
- `NEXT_PUBLIC_SUPABASE_URL=<your Supabase project URL>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Supabase anon key>`

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
