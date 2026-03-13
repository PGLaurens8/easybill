# Deployment Stack

## Recommended production split

- `Frontend`: Vercel
- `Backend API`: Railway
- `Database/Auth/Storage`: Supabase

This is the best low-ops setup for this product.

## Why this split

### Vercel for the frontend

- excellent fit for Next.js
- global edge delivery
- preview deployments from GitHub
- keep the UI deployment path separate from API/database changes

### Railway for the FastAPI backend

- simpler than container orchestration for a single API service
- cheap enough to start
- easy GitHub deploy flow
- supports persistent environment variables, health checks, and custom domains

### Supabase for state

- managed Postgres
- built-in auth if we want to use Supabase JWTs
- object storage for claim attachments and issued certificates
- row-level security available where we want direct Postgres-backed access patterns

## Recommended environment boundaries

### Frontend

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Backend

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `FRONTEND_ORIGIN`
- `SENTRY_DSN`

## Production checklist

1. Put Supabase behind pooled Postgres connections
2. Run Alembic migrations from CI or a protected deploy job
3. Expose `/healthz` from the API and use it as Railway health check
4. Send backend logs to a single sink
5. Add Sentry for frontend and backend exceptions
6. Store generated certificate PDFs in Supabase Storage
7. Do not let the frontend calculate certificate totals authoritatively
8. Use server-side JWT verification for all write operations

## Cost-aware observability

- Sentry for exceptions
- Railway logs for API runtime
- Supabase logs for database/auth events
- structured JSON logs from the API

This is enough for an early production system without introducing a large observability bill.
