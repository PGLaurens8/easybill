# Security Review: Tenant Isolation and Access (2026-09-26)

Scope: FastAPI backend, React app, Supabase configuration, hosting. Focus: can one company (tenant) or one
subcontractor see or change another's data, and how companies connect with subcontractors.

## How isolation works

- Every company is an **organization**. People belong through **memberships** with one role
  (Admin, Commercial Manager, Quantity Surveyor, Accounts, Subcontractor).
- Every API request names an organization (`X-Organization-Id`). `require_org_membership` checks the caller
  is a member of it and returns their role; every query is then filtered by that organization.
- Records referenced by id (project, contract, BOQ item, claim, certificate, member) are always re-checked
  to belong to the same organization before use, so ids from another tenant are rejected.
- A **Subcontractor** additionally sees only contracts linked to their login (`contracts.subcontractor_user_id`):
  projects, BOQs, claims, certificates and member lists are all narrowed; others' records return 404.
- Who may do what (approve, certify, pay) is a single matrix in `backend/app/core/permissions.py`.
- Joining a company requires **consent**: an admin invites an email address and only a signed-in user with
  that **verified** email can accept. There is no API to add someone without their acceptance.

Covered by tests: `tests/test_commercial_flow.py` (subcontractor isolation, role limits),
`tests/test_invitations.py` (consent, verified email, revoke/decline), `tests/test_organization_routes.py`.

## Findings and fixes

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | **Critical** | No row-level security. Supabase exposes `public` tables through its REST API with the anon key that ships in the app, so anyone could read and modify every tenant's data, bypassing the API. | Fixed: migration `20260926_000003` enables RLS on all tables and revokes `anon`/`authenticated` privileges. Verified on Postgres: before, the anon role read 5 contracts; after, "permission denied". |
| 2 | High | A Subcontractor-role user could see every contract, rate, claim and certificate in the organization. | Fixed (earlier this week): contract-level scoping for subcontractors. |
| 3 | High | Admins could add any existing user to their organization, or trigger Supabase invite emails to any address, without the recipient's consent. | Fixed: replaced with invitations that the recipient accepts; no emails are sent by the API. |
| 4 | Medium | Invitation takeover if unverified emails could accept. | Fixed: accepting requires `email_confirmed`; keep "Confirm email" on in Supabase. |
| 5 | Medium | CORS trusted every `*.vercel.app` site. Tokens are bearer (not cookies) so impact was limited, but it was needlessly broad. | Fixed: default is localhost only; production is same-origin and needs no CORS. |
| 6 | Medium | CSV exports could carry spreadsheet formulas typed by another company (e.g. in claim notes) that run when opened in Excel. | Fixed: formula-leading cells are neutralised. |
| 7 | Low | Client-supplied `X-Request-Id` echoed into logs unchecked. | Fixed: only short plain ids are accepted. |
| 8 | Low | Unbounded list sizes and note lengths in requests. | Fixed: caps (5 000 lines, 2 000-character notes). |
| 9 | Low | Missing browser security headers. | Fixed: `nosniff`, `X-Frame-Options: DENY`, HSTS, referrer and permissions policies in `vercel.json`. |
| 10 | Low | User ids were sent to a third-party avatar service. | Fixed earlier this week. |

## Remaining risks and recommendations

1. **Defence in depth:** isolation is enforced in the API layer. RLS now blocks the Supabase REST path
   entirely, but a future improvement is per-tenant RLS policies (set the organization on each DB session)
   so a bug in one query cannot leak across tenants.
2. **Rate limiting:** none in the API. Add basic limits (e.g. on invitations and login-heavy endpoints) before
   opening sign-ups widely.
3. **Login verification** calls Supabase on every request. Fine for a prototype; verify JWTs locally (JWKS)
   later for speed and resilience.
4. **Audit trail** is recorded (claims, certificates) but has no screen and is not tamper-evident. Add a
   read-only history view; consider append-only protection for certificates.
5. **Content-Security-Policy** not yet set; add one once the external font and Supabase origins are final.
6. **Shared demo login:** isolated to the demo organization and cannot invite anyone. Reset its data with
   `seed_demo --reset` periodically.
7. **Backups:** Supabase Free has limited backup options. Export real data regularly before relying on it.
8. **POPIA:** the app stores names, emails and company commercial data. Before real use, publish a privacy
   notice, define retention, and restrict who can export.

## Foundation for company-to-company connections, marketplace and tendering (future)

The current model is right for a prototype: a subcontractor's staff join each main contractor's workspace
by invitation, and see only their own contracts. Keep these in mind so later features fit without rework:

- **Subcontractor companies as organizations.** `contracts.contractor_organization_id` already exists
  (unused). Next step: let a subcontractor create their own organization and link it to contracts, so their
  whole team sees work across all main contractors in one place.
- **Company connections.** Generalise invitations from person → company: an `organization_connections`
  table (requested / accepted / revoked) that either side can request and the other accepts. Contract access
  then flows from the connection plus the contract link, still with no data shared by default.
- **Company profile.** Trades, regions, CIDB grading, B-BBEE level, tax and COIDA documents with expiry dates,
  shared only with connected companies.
- **Tendering (RFQ).** The BOQ-revision model fits: publish a BOQ *without rates* to selected connected
  subcontractors, they price it, compare quotes side by side, and awarding creates the contract with the
  priced BOQ as Rev 1.
- **Compliance notes (check with an attorney before launch).** Private-sector subcontract procurement in South
  Africa is lightly regulated, but public-sector work falls under the PFMA / PPPFA and CIDB regulations, and
  profiles and documents are personal / commercial information under POPIA (explicit consent to share,
  purpose limitation). A marketplace that takes fees or matches parties should also review consumer and
  competition rules.
