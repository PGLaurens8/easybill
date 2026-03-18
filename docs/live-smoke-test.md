# Live Smoke Test Checklist

Run this against the current live stack in this exact order.

Assumptions:

- Railway backend is already deployed
- Supabase auth is active
- Vercel frontend is using the correct `VITE_` environment variables

## 1. Confirm environment wiring

1. Open the Railway service and confirm the latest expected deploy is green.
2. Open `https://<your-railway-domain>/healthz`.
3. Open the Vercel app and confirm login loads without a blank screen or config error.
4. In browser devtools, keep `Network` open for the rest of the test.

Expected result:

- `/healthz` returns a success response
- frontend loads and shows the QuantEasy login screen

Capture if it fails:

- full failing URL
- HTTP status
- response body
- screenshot of Railway deploy state if relevant

## 2. Authenticate and verify organization bootstrap

1. Sign in through the Vercel frontend.
2. If no organization exists, create one from the app flow or the API.
3. Confirm the organization selector in the header shows the active organization.
4. In devtools, verify the frontend successfully calls `GET /api/v1/organizations`.

Expected result:

- no 401 or 403 responses
- organization list loads
- `Authorization` header is present on authenticated API calls

Capture if it fails:

- failing request from `Network`
- response body
- whether `X-Organization-Id` was present on project-scoped requests

## 3. Verify base commercial records exist

1. Open the Projects screen.
2. Confirm at least one project loads, or create one.
3. Confirm the project save request returns success.
4. Open the BOQ Builder screen.
5. Confirm at least one contract exists for the selected project, or create one.
6. Confirm at least one BOQ revision exists for the target contract, or create one.

Expected result:

- project list loads from `GET /api/v1/projects`
- contract list loads from `GET /api/v1/contracts`
- BOQ revisions load from `GET /api/v1/boq-revisions`
- create actions return 200/201 and refresh the UI state

Capture if it fails:

- exact request payload
- exact response payload
- whether the selected organization in the UI matches the header sent

## 4. Test claim creation end to end

1. Open the Claims screen.
2. Confirm the page loads contract and BOQ-backed draft lines.
3. Pick the project and contract that already have a BOQ revision.
4. Enter a non-zero quantity for at least one line.
5. Set `Period number` to a value not already used for that contract.
6. Submit the claim.

Expected result:

- frontend sends `POST /api/v1/claims`
- response is `201`
- created claim appears in the claim list
- total claimed amount is populated

Recommended API payload shape:

```json
{
  "organization_id": "<organization-id>",
  "project_id": "<project-id>",
  "contract_id": "<contract-id>",
  "period_number": 1,
  "remarks": "Initial valuation period",
  "lines": [
    {
      "boq_item_id": "<boq-item-id>",
      "previous_certified_quantity": "0.0000",
      "claimed_quantity_this_period": "125.0000",
      "claimed_materials_on_site_value": "0.00",
      "notes": "First period measured work"
    }
  ]
}
```

Capture if it fails:

- request payload
- response body
- whether the chosen `boq_item_id` belongs to the selected contract
- whether the period number already exists

## 5. Test claim lifecycle transitions

Run these transitions on the created claim:

1. `Submitted`
2. `UnderReview`
3. `Approved`
4. `Certified`
5. `Paid`

Expected result:

- frontend sends `PATCH /api/v1/claims/<claim-batch-id>/status`
- status updates persist after refresh
- `submitted_at` is populated when first submitted
- `reviewed_at` is populated on review-stage statuses

Example status payload:

```json
{
  "status": "Submitted",
  "remarks": "Submitted for review"
}
```

Capture if it fails:

- exact status value sent
- full response body
- whether the user’s org role should have write access

## 6. Test export flows

1. On the Claims screen, click `Export CSV`.
2. Confirm a `claims-summary.csv` download starts.
3. Select a claim and click `Export Selected`.
4. Confirm a `claim-period-<n>.json` download starts.
5. If BOQ export is part of today’s pass, open the BOQ export flow and test Excel, PDF, and CSV downloads.

Expected result:

- downloads start with no console error
- exported files contain the selected live data, not placeholder data

Capture if it fails:

- browser console error
- whether the click triggered any network call
- generated filename

## 7. Record final outcome

If all steps pass, record:

- Railway deploy ID or commit SHA tested
- Railway domain tested
- Vercel domain tested
- organization, project, contract, BOQ revision, and claim IDs used

If any step fails, record:

- exact step number
- exact request URL
- request payload
- response status
- response body
- screenshot of browser devtools or Railway logs
