# QuantEasy Backend Architecture

## Product Goal

QuantEasy should cover the commercial core that contractors and quantity surveyors use every month, without inheriting the breadth and operational weight of suites like RIB Candy or BuildSmart.

The narrow scope is:

1. Projects and contracts
2. BOQ revisions and line-item rates
3. Progress claims by period
4. QS certification and payment certificates
5. Variations, contra charges, retention, and tax
6. Audit trail, approvals, and attachments

Everything else should be optional and layered on later.

## Calculation Model

The backend should use certificate-to-date logic rather than ad hoc spreadsheet edits.

### BOQ line amount

`line_amount = contract_quantity * rate`

### Quantity position on a BOQ item

`certified_to_date_qty = previous_certified_qty + certified_this_period_qty`

`remaining_qty = contract_qty - certified_to_date_qty`

Validation rule:

- Never allow certified-to-date quantity to exceed contract quantity unless the line is covered by an approved variation.

### Claim value this period

For standard measured work:

`claimed_value_this_period = claimed_quantity_this_period * rate`

Claims must store:

- claimed quantity this period
- claimed materials on site value
- notes and attachment set

### Certified value to date

For a certificate, calculate to date:

`gross_value_to_date =`

- `work_value_to_date`
- `+ materials_on_site_value_to_date`
- `+ preliminaries_value_to_date`
- `+ dayworks_value_to_date`
- `+ variation_value_to_date`
- `+ escalation_value_to_date`
- `- contra_charges_to_date`
- `- other_deductions_to_date`

### Retention held to date

`retention_held_to_date = min(gross_value_to_date * retention_percent, contract_value * retention_cap_percent)`

Retention release should be modeled explicitly as events, not as hidden manual adjustments.

### Net certified to date

`net_certified_to_date_excl_tax = gross_value_to_date - retention_held_to_date - advance_recovery_to_date`

### Amount due this certificate

`amount_due_this_certificate_excl_tax = net_certified_to_date_excl_tax - previous_net_certified_excl_tax`

`tax_this_certificate = amount_due_this_certificate_excl_tax * tax_percent`

`amount_due_this_certificate_incl_tax = amount_due_this_certificate_excl_tax + tax_this_certificate`

This is the backbone of the backend calculation engine.

## Domain Model

### Core entities

- `organizations`
- `users`
- `memberships`
- `projects`
- `contracts`
- `boq_revisions`
- `boq_items`
- `rate_templates`
- `rate_template_components`
- `claim_batches`
- `claim_lines`
- `certificate_batches`
- `certificate_lines`
- `variation_orders`
- `payment_transactions`
- `attachments`
- `audit_events`

### Non-negotiable rules

- Every claim and certificate belongs to one project and one contract.
- BOQ items are immutable once a revision is published.
- Corrections happen through a new BOQ revision or approved variation, never silent edits.
- A certificate is derived from claim lines plus QS certification decisions.
- Payments are separate from certification.
- Every approval, rejection, release, and payment emits an audit event.

## Recommended Backend Stack

### Application

- Next.js app for the UI
- FastAPI for the commercial API
- PostgreSQL as the system of record
- SQLAlchemy for the ORM and query layer
- Alembic for schema migrations

### Services

- `commercial-service`
  - BOQ revisions
  - claims
  - certificate calculations
- `identity-service`
  - org membership
  - roles
  - session and token checks
- `document-service`
  - upload metadata
  - virus scan hooks
  - signed URLs
- `notification-service`
  - claim submitted
  - certificate issued
  - payment marked paid

### Storage

- PostgreSQL for relational state
- object storage for attachments and generated PDFs
- Redis only if queueing or caching becomes necessary

## API Shape

Keep the API task-based, not table-based.

### Example endpoints

- `POST /api/projects`
- `POST /api/contracts`
- `POST /api/boq-revisions`
- `POST /api/claims`
- `POST /api/claims/:id/submit`
- `POST /api/claims/:id/review`
- `POST /api/certificates`
- `POST /api/certificates/:id/issue`
- `POST /api/payments`
- `GET /api/projects/:id/commercial-summary`

## Security

- Enforce role-based access at the service layer, not only the UI
- Use row-level authorization by organization and project membership
- Record actor, timestamp, reason, and before/after values for approvals
- Protect generated certificates from mutation after issue
- Scan uploads and store immutable certificate PDFs

## Reliability

- Use transactional writes for claim submit, certificate issue, and payment posting
- Make certificate issue idempotent using request keys
- Add optimistic locking on mutable commercial documents
- Do not calculate certificate amounts in the client and trust them
- Recompute server-side on every submit and issue action

## Observability

- structured logs with `project_id`, `contract_id`, `claim_id`, `certificate_id`
- metrics:
  - claim submission rate
  - certificate issue latency
  - calculation failures
  - approval turnaround time
- audit-event stream for commercial actions
- tracing around certificate generation and PDF rendering

## Simple UX Strategy

The UI should be smaller than Candy/BuildSmart by focusing on the monthly commercial cycle:

1. Select project and contract
2. Open current claim period
3. Enter quantities only on relevant BOQ lines
4. Show instant remaining quantity and value to date
5. Review QS adjustments side by side
6. Issue certificate with one commercial summary card

Default views should be:

- one project
- one contract
- one period
- one table

Advanced features should stay behind optional drawers, not in the main workflow.

## Build Order

1. Shared domain types and pure calculation engine
2. Database schema and migrations
3. Auth and org-role enforcement
4. BOQ revision publishing
5. Claim submission and certification
6. Payment certificate issuance
7. Attachments, audit, notifications
8. Reporting and integrations
