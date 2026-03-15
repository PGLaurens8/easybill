# QuantEasy Backend

FastAPI service for the commercial core:

- organizations and memberships
- projects and contracts
- BOQ revisions and BOQ items
- claims and certificates
- audit events

## Stack

- FastAPI
- SQLAlchemy 2.x
- Alembic
- Supabase Postgres

## Local setup

1. Create a Python 3.11+ virtual environment.
2. Install dependencies from `pyproject.toml`.
3. Set environment variables:

```bash
export DATABASE_URL="postgresql+psycopg://postgres:password@db.host:5432/postgres"
export APP_ENV="development"
export FRONTEND_ORIGIN="http://localhost:9002"
```

4. Run migrations:

```bash
alembic upgrade head
```

5. Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

## Deployment recommendation

- `frontend`: Vercel
- `backend`: Railway
- `database`, `auth`, `storage`: Supabase

That keeps the frontend fast, the API cheap to run, and Postgres/Auth/Storage managed.
