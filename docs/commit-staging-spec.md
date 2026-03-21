# Commit Staging Spec

Use this staging plan to keep the verified preview, certificate UX, and backend diagnostic changes separate from in-progress backend commercial feature work.

## Commit Message

`Fix preview stability, add certificate UX/tests, and harden backend diagnostics`

## Stage These Files

- `.gitignore`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `src/main.tsx`
- `src/components/Layout.tsx`
- `src/pages/Certificates.tsx`
- `src/pages/Certificates.test.tsx`
- `src/test/setup.ts`
- `docs/session-brief.md`
- `docs/setup-runbook.md`
- `docs/commit-staging-spec.md`
- `backend/app/api/deps/auth.py`
- `backend/app/main.py`
- `backend/tests/test_organization_db.py`

## Do Not Stage

Keep these out of this commit unless they are being reviewed and shipped separately:

- generated `dist/` assets
- Python cache directories and `__pycache__`
- in-progress backend commercial workflow files already modified in the worktree

Examples currently present in the worktree:

- `backend/app/api/router.py`
- `backend/app/api/routes/claims.py`
- `backend/app/schemas/claim.py`
- `backend/app/services/commercial.py`
- `backend/app/api/routes/certificates.py`
- `backend/app/schemas/certificate.py`
- backend tests other than `backend/tests/test_organization_db.py`

## Verification

Run before or after staging:

- `npm test`
- `npm run build`
