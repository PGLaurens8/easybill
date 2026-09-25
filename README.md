# QuantEasy

Subcontract commercial control for main contractors, without the bulk of Candy or BuildSmart.

QuantEasy covers the slice most teams actually use every month:

1. **Set up** a subcontract per package and load its priced BOQ (paste straight from Excel).
2. **Claim**: the subcontractor (or your QS on their behalf) enters progress as a quantity or % complete.
3. **Approve**: the QS approves, or rejects with a reason the subcontractor sees.
4. **Certify**: the QS adjusts any quantity they disagree with, checks the payment figure, and issues
   the payment certificate. Retention (with cap), previous payments and VAT are worked out for you.
5. **Pay**: accounts marks the certificate paid.

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
retention             = gross × retention %, capped at cap % × contract value
net to date           = gross − retention
amount due (excl VAT) = net to date − net on the previous live certificate
VAT                   = amount due × VAT %
```

Certified quantities carry across BOQ revisions by item code. A voided certificate drops out of the
ledger and returns its claim to *Approved* so it can be re-certified.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind SPA (`src/`), deployed on Vercel.
  - `context/`: auth (Supabase) and app data (one place that talks to the API)
  - `pages/`: one screen per workflow step
  - `lib/`: API client, permissions mirror, read-model helpers, certificate document
  - `utils/`: formatting, CSV/print, Excel paste parser
- **Backend**: FastAPI + SQLAlchemy + Alembic (`backend/`), deployed on Railway.
  - `api/routes/`: thin HTTP layer; `api/deps/auth.py` resolves the caller's role per organization
  - `services/`: business rules split by area (`claims`, `certificates`, `boq`, `projects`,
    `organizations`), plus `valuation` (maths), `ledger` (certified to date), `access` (scoping), `audit`
  - `core/permissions.py`: role matrix and claim lifecycle
- **Platform**: Supabase Postgres, Auth and Storage.

## Getting started

```bash
npm install
cp .env.example .env          # VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

Backend (see `backend/README.md`):

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt pytest
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Set `SUPABASE_SERVICE_ROLE_KEY` on the API to add team members by email (existing users are found,
new ones are invited). Without it, members can still be added by user ID.

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
- Deployment runbook: [docs/setup-runbook.md](docs/setup-runbook.md)
- Live smoke test: [docs/live-smoke-test.md](docs/live-smoke-test.md)
