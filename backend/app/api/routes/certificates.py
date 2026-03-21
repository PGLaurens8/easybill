from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_org_membership
from app.db.session import get_db
from app.models.commercial import MembershipRole
from app.schemas.auth import CurrentUser
from app.schemas.certificate import CertificateBatchCreate, CertificateBatchRead
from app.services.commercial import create_certificate_batch, list_certificate_batches

router = APIRouter()

certificate_write_roles = {
    MembershipRole.org_admin,
    MembershipRole.commercial_manager,
    MembershipRole.accounts,
}


@router.get("", response_model=list[CertificateBatchRead])
def list_certificate_batches_endpoint(
    organization_id=Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return list_certificate_batches(db, organization_id)


@router.post("", response_model=CertificateBatchRead, status_code=status.HTTP_201_CREATED)
def create_certificate_batch_endpoint(
    payload: CertificateBatchCreate,
    organization_id=Depends(require_org_membership(certificate_write_roles)),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.organization_id == organization_id:
        return create_certificate_batch(db, payload, current_user.id)

    payload = payload.model_copy(update={"organization_id": organization_id})
    return create_certificate_batch(db, payload, current_user.id)
