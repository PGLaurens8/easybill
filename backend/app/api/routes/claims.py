from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_org_membership
from app.core.permissions import CLAIM_PREPARE_ROLES
from app.db.session import get_db
from app.schemas.auth import OrgAccess
from app.schemas.claim import ClaimBatchCreate, ClaimBatchRead, ClaimBatchStatusUpdate, ClaimBatchUpdate
from app.services.claims import create_claim_batch, list_claim_batches, update_claim_batch, update_claim_batch_status

router = APIRouter()


@router.get("", response_model=list[ClaimBatchRead])
def list_claim_batches_endpoint(
    access: OrgAccess = Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return list_claim_batches(db, access.organization_id, access.contractor_scope)


@router.post("", response_model=ClaimBatchRead, status_code=status.HTTP_201_CREATED)
def create_claim_batch_endpoint(
    payload: ClaimBatchCreate,
    access: OrgAccess = Depends(require_org_membership(CLAIM_PREPARE_ROLES)),
    db: Session = Depends(get_db),
):
    return create_claim_batch(
        db, payload.model_copy(update={"organization_id": access.organization_id}), access.user_id
    )


@router.put("/{claim_batch_id}", response_model=ClaimBatchRead)
def update_claim_batch_endpoint(
    payload: ClaimBatchUpdate,
    claim_batch_id: UUID = Path(...),
    access: OrgAccess = Depends(require_org_membership(CLAIM_PREPARE_ROLES)),
    db: Session = Depends(get_db),
):
    return update_claim_batch(db, access.organization_id, claim_batch_id, payload, access.user_id)


@router.patch("/{claim_batch_id}/status", response_model=ClaimBatchRead)
def update_claim_batch_status_endpoint(
    payload: ClaimBatchStatusUpdate,
    claim_batch_id: UUID = Path(...),
    access: OrgAccess = Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    # Which role may make which transition is decided per transition in the service.
    return update_claim_batch_status(db, access.organization_id, claim_batch_id, payload, access.user_id)
