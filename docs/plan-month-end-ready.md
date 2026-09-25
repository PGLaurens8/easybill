# Plan: make QuantEasy work for a real QS month-end

## Who and what

A main contractor's QS running ~5–15 subcontract packages on a site. Every month: subcontractors claim,
the QS values and certifies, accounts pays. Subcontractors want to know what they will be paid and why.

## What already works

Priced BOQ per subcontract (paste from Excel) → subcontractor claims by quantity or % → QS approves or
rejects with a reason → QS adjusts quantities and certifies (cumulative, retention with cap, VAT) →
accounts marks paid. Subcontractors only see their own contracts; people join by invitation.

## What would stop him using it in month one (built 2026-09-27)

| # | Gap | Why it matters on site | Build |
|---|---|---|---|
| 1 | **Variations** | Almost every package gets instructed extra work in month one. Without variations the BOQ, the claim and the certificate are wrong. | Variation register per contract (VO-001…). Subcontractor can submit one with priced lines; QS approves or rejects with a reason (or records an approved one directly). Approved lines join the BOQ as a new revision, so they are claimed and certified like any other item and the contract value updates. |
| 2 | **Contra-charges** (deductions) | Main contractors deduct for damage, cleaning, supplied materials, attendance. Today these are handled outside the system, so the certificate never matches what is paid. | Deductions per contract (description, amount, date). Deducted on the next certificate (cumulative, so each is deducted once), shown on the certificate and to the subcontractor. Voiding a certificate un-deducts them. |
| 3 | **One place per contract** | "What is the position on Mthembu's contract?" is the most common question. Today the answer is spread across four pages. | Contract page: original value, approved variations, revised value, certified to date, retention held, deductions, paid, with tabs for Variations, Deductions, Certificates and BOQ. Every contract code links there. |
| 4 | **Valuation month** | QSs and accounts talk in months ("the February valuation"), not period numbers. | Claims carry a valuation month (defaults to this month), shown next to the period everywhere. |
| 5 | **Month-end payment schedule** | Accounts needs one list per month: who, which certificate, how much, paid or not. | Payment schedule on Certificates filtered by month, with totals and a CSV export. |
| 6 | **Retention release** | At practical completion half the retention is released, the rest after the defects period. Without it the last months of every contract are done in Excel. | Practical and final completion dates on the contract; retention held drops to 50% / 0% on certificates issued after them; a "retention release certificate" can be issued without a claim. |

## Later (not now)

- Email notifications (claim submitted / rejected / certified): needs an email provider and domain; the
  dashboard queues cover this for a prototype.
- Photos and measurement sheets attached to claims (Supabase Storage).
- Dayworks sheets, escalation (CPAP), main-contract (client) valuation, cash-flow forecast.
- Company-to-company connections and tendering (see security-review.md).

## Test scenario (acceptance)

Project "Riverside Residential", director and QS at Acme Builders, accounts, two subcontractors.

1. QS creates Brickwork (Mthembu) and Roofing (Top Roof) contracts, pastes BOQs, invites both subs.
2. **Month 1:** Mthembu claims 40% of face brick. Mthembu submits **VO-001** "Extra boundary wall"
   (60 m² @ R450). QS approves it; the contract value rises by R27 000 and the BOQ shows the VO lines.
3. QS records a **deduction** of R3 500 against Mthembu ("Cleaning of rubble, Block A").
4. QS certifies month 1: the certificate shows gross, retention, less deduction R3 500, amount due.
5. **Month 2:** Mthembu claims 30 m² of the VO wall plus more brickwork. The certificate includes VO value,
   and the R3 500 deduction is **not** taken again.
6. Accounts opens the payment schedule for month 2, sees both certificates due, exports CSV, marks paid.
7. QS sets **practical completion**; issues a **retention release certificate**: retention held halves and
   the released half is paid.
8. Mthembu (subcontractor login) opens their contract page and sees the same numbers, the VO and the
   deduction, and nothing from Top Roof.

## Status

All six items are built. The scenario above passes as an API test
(`backend/tests/test_month_end_scenario.py`, exact rand figures) and as a scripted browser run against
FastAPI + Postgres: month 1 R 169 855,00, month 2 R 100 912,50 (variation included, deduction taken once),
payment schedule R 270 767,50, retention release R 15 266,25.
