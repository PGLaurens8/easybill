from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_org_membership
from app.db.session import get_db
from app.models.commercial import MembershipRole
from app.schemas.auth import CurrentUser
from app.schemas.claim import ClaimBatchCreate, ClaimBatchRead, ClaimBatchStatusUpdate
from app.services.commercial import create_claim_batch, list_claim_batches, update_claim_batch_status

router = APIRouter()

claim_create_roles = {
    MembershipRole.org_admin,
    MembershipRole.commercial_manager,
    MembershipRole.quantity_surveyor,
}

claim_status_roles = {
    MembershipRole.org_admin,
    MembershipRole.commercial_manager,
    MembershipRole.quantity_surveyor,
    MembershipRole.accounts,
}


@router.get("", response_model=list[ClaimBatchRead])
def list_claim_batches_endpoint(
    organization_id=Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return list_claim_batches(db, organization_id)


@router.post("", response_model=ClaimBatchRead, status_code=status.HTTP_201_CREATED)
def create_claim_batch_endpoint(
    payload: ClaimBatchCreate,
    organization_id=Depends(require_org_membership(claim_create_roles)),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.organization_id == organization_id:
        return create_claim_batch(db, payload, current_user.id)

    payload = payload.model_copy(update={"organization_id": organization_id})
    return create_claim_batch(db, payload, current_user.id)


@router.patch("/{claim_batch_id}/status", response_model=ClaimBatchRead)
def update_claim_batch_status_endpoint(
    payload: ClaimBatchStatusUpdate,
    claim_batch_id: UUID = Path(...),
    organization_id=Depends(require_org_membership(claim_status_roles)),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_claim_batch_status(db, organization_id, claim_batch_id, payload, current_user.id)
