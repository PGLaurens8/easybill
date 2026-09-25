# Setup Runbook (Vercel + Supabase, free tier)

QuantEasy runs as **one Vercel project** (React app + FastAPI API as a Python function, same origin) and
**one Supabase project** (Postgres + Auth). Railway is no longer used.

Free-tier limits worth knowing:

- **Vercel Hobby** is free for personal / non-commercial use. Fine for a prototype; move to Pro once you
  charge customers.
- **Supabase Free** pauses a project after about a week without activity (restore it from the dashboard),
  allows two active projects, 500 MB database, and sends only a handful of auth emails per hour with the
  built-in mailer. For more than a few test sign-ups, add a free SMTP provider (e.g. Resend, Brevo) under
  Authentication → Emails → SMTP.

## 1. Supabase

1. Restore the paused project (Project → Restore), or create a new one. A new project is fine; migrations
   build the schema from scratch.
2. Authentication → Providers → Email: keep **Confirm email ON**. Invitations are matched by email address,
   so an unconfirmed address must never be able to accept one.
3. Authentication → URL Configuration: set **Site URL** to your Vercel URL (e.g. `https://easybill-ten.vercel.app`)
   and add it to Redirect URLs, so confirmation links come back to the app.
4. Project Settings → Database → Connection string: copy the **Transaction pooler** URI (port `6543`) and
   change the scheme to `postgresql+psycopg://`. This is `DATABASE_URL` for Vercel.
5. Also note the **Session pooler** URI (port `5432`) for running migrations from your machine.

## 2. Database migrations

From `backend/` on your machine (or a Codespace):

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL='postgresql+psycopg://postgres.<ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres' alembic upgrade head
```

No shell? Run the files in `backend/sql/` in order in the Supabase SQL editor instead.

Migration `20260926_000003` enables row-level security on every table and revokes access for Supabase's
`anon` / `authenticated` API roles. **Do not skip it**: without it, anyone holding the public anon key can
read and change every company's data through Supabase's REST API.

## 3. Vercel

1. Import the GitHub repo (root directory = repo root; framework preset Vite; build `npm run build`,
   output `dist`). `vercel.json` routes `/api/*` to the Python function in `api/index.py`.
2. Environment variables:

   | Name | Value | Used by |
   | --- | --- | --- |
   | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | app |
   | `VITE_SUPABASE_ANON_KEY` | anon / publishable key | app |
   | `DATABASE_URL` | transaction pooler URI, port 6543, `postgresql+psycopg://…` | API |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` | API (verifies logins) |
   | `SUPABASE_ANON_KEY` | anon / publishable key | API |
   | `APP_ENV` | `production` | API |

   Do **not** set `VITE_API_BASE_URL` (the API is same-origin) and do **not** put the service-role key on Vercel.
3. Deploy, then open `https://<your-app>/healthz`; it should return `{"status":"ok"}`.

### Optional demo login

Add `VITE_DEMO_EMAIL` and `VITE_DEMO_PASSWORD` to show a "Try the demo" button. These values are visible in
the browser bundle, so use a dedicated demo user, never a real account.

Create that user and a populated demo workspace from `backend/` (session pooler URL; the service-role key is
only needed here, on your machine):

```bash
DATABASE_URL='…:5432/postgres' SUPABASE_URL='https://<ref>.supabase.co' SUPABASE_SERVICE_ROLE_KEY='…' \
  python -m scripts.seed_demo --email demo@quanteasy.app --password '<demo password>' --owner-email <your login email>
```

The demo login is a Commercial Manager (it cannot invite people). Re-run with `--reset` to restore the data.

## 4. Smoke test

Follow [live-smoke-test.md](live-smoke-test.md). Include: sign up a second account, invite it as a
Subcontractor from Team, accept the invitation, link it to a contract, and confirm it sees only that contract.

## Local development

```bash
# terminal 1
cd backend && DATABASE_URL=… SUPABASE_URL=… SUPABASE_ANON_KEY=… uvicorn app.main:app --port 8000
# terminal 2 (Vite proxies /api to port 8000)
npm run dev
```
