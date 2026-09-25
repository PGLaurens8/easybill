# QuantEasy

Subcontract commercial control for main contractors, without the bulk of Candy or BuildSmart.

QuantEasy covers the slice most teams actually use every month:

1. **Set up** a subcontract per package and load its priced BOQ (paste straight from Excel).
2. **Claim**: the subcontractor (or your QS on their behalf) enters progress as a quantity or % complete.
3. **Approve**: the QS approves, or rejects with a reason the subcontractor sees.
4. **Certify**: the QS adjusts any quantity they disagree with, checks the payment figure, and issues
   the payment certificate. Retention (with cap), previous payments and VAT are worked out for you.
5. **Pay**: accounts works through the month's payment schedule and marks certificates paid.

Around that cycle: **variations** (a subcontractor submits, the QS approves and the lines join the BOQ),
**deductions / contra-charges** (taken once on the next certificate, visible to the subcontractor),
**retention release** at practical and final completion, and a **contract page** per subcontract showing
original value, variations, certified to date, retention, deductions and payments in one place.

## Who sees what

| Role | Can |
| --- | --- |
| Director / Admin | Everything, including adding people |
| Commercial Manager | Contracts, BOQs, approve claims, certify, mark paid |
| Quantity Surveyor | Contracts, BOQs, approve claims, certify |
| Accounts | View everything, mark certificates paid |
| Subcontractor | Only the contracts linked to their login: submit claims, view their certificates |

Subcontractors never see other subcontractors' contracts, rates, claims or certificates. The API enforces
this (`backend/app/core/permissions.py`); the UI mirrors it in `src/lib/permissions.ts`.

## How the payment certificate is valued

Cumulative method (`backend/app/services/valuation.py`, pure and unit tested):

```
gross value to date   = Σ(cumulative certified qty × rate) over the whole BOQ + materials on site
retention             = gross × retention %, capped at cap % × contract value (latest BOQ),
                        less the share released (half at practical completion, all at final)
net to date           = gross − retention held − deductions to date
amount due (excl VAT) = net to date − net on the previous live certificate
VAT                   = amount due × VAT %
```

Certified quantities carry across BOQ revisions by item code. A voided certificate drops out of the
ledger and returns its claim to *Approved* so it can be re-certified.

## Architecture

Hosting: **one Vercel project** serves both the app and the API (same origin, `vercel.json` + `api/index.py`),
with **Supabase** for Postgres and Auth. Both run on free tiers for prototyping; see
[docs/setup-runbook.md](docs/setup-runbook.md).

- **Frontend**: React + TypeScript + Vite + Tailwind SPA (`src/`).
  - `context/`: auth (Supabase) and app data (one place that talks to the API)
  - `pages/`: one screen per workflow step
  - `lib/`: API client, permissions mirror, read-model helpers, certificate document
  - `utils/`: formatting, CSV/print, Excel paste parser
- **Backend**: FastAPI + SQLAlchemy + Alembic (`backend/`), running as a Vercel Python function.
  - `api/routes/`: thin HTTP layer; `api/deps/auth.py` resolves the caller's role per organization
  - `services/`: business rules split by area (`claims`, `certificates`, `boq`, `projects`,
    `organizations`), plus `valuation` (maths), `ledger` (certified to date), `access` (scoping), `audit`
  - `core/permissions.py`: role matrix and claim lifecycle
- **Platform**: Supabase Postgres and Auth. Row-level security blocks Supabase's public REST API; all data
  access goes through the FastAPI layer.

## Getting started

```bash
npm install
cp .env.example .env          # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev                   # proxies /api to the backend on port 8000
```

Backend (see `backend/README.md`):

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt pytest
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

People join a workspace by invitation: an admin invites an email address on the Team page, and the person
signs in (or creates an account) with that verified email and accepts. Nobody is added without accepting.

## Checks

```bash
npm test            # Vitest + Testing Library
npm run lint        # ESLint
npm run build       # type-check + production build

cd backend
pytest              # sqlite by default
TEST_DATABASE_URL=postgresql+psycopg://… pytest   # same tests against Postgres
ruff check app tests
```

## Project docs

- Session brief and handoff: [docs/session-brief.md](docs/session-brief.md)
- Security review: [docs/security-review.md](docs/security-review.md)
- Month-end readiness plan and acceptance scenario: [docs/plan-month-end-ready.md](docs/plan-month-end-ready.md)
- Deployment runbook: [docs/setup-runbook.md](docs/setup-runbook.md)
- Live smoke test: [docs/live-smoke-test.md](docs/live-smoke-test.md)
