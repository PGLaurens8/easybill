# Live Smoke Test Checklist

Run this against the current deployed stack in this exact order.

Assumptions:

- Railway backend is deployed with the current `feature/org-membership-management` changes or an equivalent merged branch
- Vercel frontend is deployed with the same code level
- Supabase auth is active
- browser devtools `Network` tab stays open during the test

## 1. Confirm environment wiring

1. Open the Railway service and confirm the latest expected deploy is green.
2. Open `https://quanteasy.up.railway.app/healthz`.
3. Open `https://easybill-ten.vercel.app`.
4. Confirm the login screen loads without a blank screen or config error.

Expected result:

- `/healthz` returns success
- frontend loads normally
- no immediate API bootstrap failure blocks login

Capture if it fails:

- full failing URL
- HTTP status
- response body
- screenshot of Railway deploy state if relevant

## 2. Authenticate and verify organization bootstrap

1. Sign in through the Vercel frontend.
2. If no organization exists yet, create one.
3. Confirm the organization selector shows the active organization.
4. In devtools, verify the frontend successfully calls `GET /api/v1/organizations`.

Expected result:

- no unexpected `401` or `403`
- organization list loads
- authenticated API calls include `Authorization`
- organization-scoped requests include `X-Organization-Id`

Capture if it fails:

- failing request from `Network`
- response body
- `X-Request-Id` response header if present
- whether `X-Organization-Id` was sent

## 3. Verify membership management

1. Open Settings.
2. Confirm the memberships list loads for the selected organization.
3. If you have a valid user UUID available, add a member.
4. If there is a non-critical test member available, update that member role.
5. In devtools, inspect the membership calls:
   - `GET /api/v1/organizations/{organization_id}/memberships`
   - `POST /api/v1/organizations/{organization_id}/memberships`
   - `PATCH /api/v1/organizations/{organization_id}/memberships/{membership_id}`

Expected result:

- membership list request succeeds
- add/update requests succeed for org admins
- route `organization_id` matches the `X-Organization-Id` header value
- non-admin behavior is correctly restricted if tested with a lower-privilege user

Capture if it fails:

- exact request URL
- request body
- response status and body
- `X-Request-Id`
- header org value versus route org value

## 4. Verify projects and project detail routing

1. Open Projects.
2. Confirm at least one project loads, or create one.
3. Open a project detail page from the project list.
4. Confirm the project detail screen shows the expected project summary data.
5. Use the project-context actions to open:
   - BOQ Builder
   - Claims
   - Certificates

Expected result:

- project list loads from `GET /api/v1/projects`
- project creation succeeds if performed
- `/projects/:projectId` loads a real workspace page, not a placeholder
- BOQ, Claims, and Certificates open with the project context already selected when possible

Capture if it fails:

- exact failing route or request
- response payload
- whether selected project state matches the route/query param used

## 5. Verify BOQ and contract setup

1. In BOQ Builder, confirm at least one contract exists for the selected project, or create one.
2. Confirm at least one BOQ revision exists for the target contract, or create one.
3. If a BOQ revision already exists, confirm the copy-forward or latest-revision workflow still behaves correctly.

Expected result:

- contract list loads
- BOQ revisions load
- create actions succeed and refresh UI state
- project preselection remains consistent when arriving from project detail

Capture if it fails:

- exact request payload
- exact response payload
- selected organization and project values at the time of the request

## 6. Test claim creation and lifecycle

1. Open Claims.
2. Pick the project and contract that already have a BOQ revision.
3. Enter a non-zero quantity for at least one line.
4. Use a `period_number` not already used for that contract.
5. Submit the claim.
6. Progress the claim through the intended statuses at least to `Approved`.

Expected result:

- frontend sends `POST /api/v1/claims`
- response is success
- created claim appears in the list
- status updates persist after refresh
- totals are populated

Capture if it fails:

- request payload
- response body
- exact status transition attempted
- `X-Request-Id`

## 7. Test certificate issuance

1. Open Certificates.
2. Confirm eligible approved or certified claims are available.
3. Issue a payment certificate for a valid claim.
4. Confirm the new certificate appears in the issued list.

Expected result:

- eligible claims filter correctly
- certificate issuance succeeds
- issued certificate appears immediately after refresh

Capture if it fails:

- exact claim used
- request payload
- response body
- `X-Request-Id`

## 8. Validate dashboard state

1. Return to Dashboard.
2. Confirm setup progress reflects the records created during the test.
3. Confirm the highlighted quick action reflects the next missing workflow step, or shows the live workflow review state if setup is complete.
4. Confirm the live summary cards link into the correct pages.

Expected result:

- setup progress count is believable for the data now in the system
- quick action priority makes sense for the current state
- summary cards navigate correctly

Capture if it fails:

- screenshot of the dashboard state
- counts shown versus actual records created
- wrong navigation target if a card links incorrectly

## 9. Record final outcome

If all steps pass, record:

- Railway deploy ID or commit SHA tested
- Railway domain tested
- Vercel domain tested
- organization, project, contract, BOQ revision, claim, and certificate IDs used
- whether membership add/update was tested successfully

If any step fails, record:

- exact step number
- exact request URL
- request payload
- response status
- response body
- `X-Request-Id`
- screenshot of browser devtools or Railway logs
