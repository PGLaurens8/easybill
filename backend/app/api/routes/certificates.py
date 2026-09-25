from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_org_membership
from app.core.permissions import CERTIFY_ROLES
from app.db.session import get_db
from app.schemas.auth import OrgAccess
from app.schemas.certificate import (
    CertificateBatchCreate,
    CertificateBatchRead,
    CertificateStatusUpdate,
    CertificateValuationRead,
    CertificateValuationRequest,
)
from app.services.certificates import (
    create_certificate_batch,
    list_certificate_batches,
    preview_certificate,
    update_certificate_status,
)

router = APIRouter()


@router.get("", response_model=list[CertificateBatchRead])
def list_certificate_batches_endpoint(
    access: OrgAccess = Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return list_certificate_batches(db, access.organization_id, access.contractor_scope)


@router.post("/preview", response_model=CertificateValuationRead)
def preview_certificate_endpoint(
    payload: CertificateValuationRequest,
    access: OrgAccess = Depends(require_org_membership(CERTIFY_ROLES)),
    db: Session = Depends(get_db),
):
    return preview_certificate(db, payload.model_copy(update={"organization_id": access.organization_id}))


@router.post("", response_model=CertificateBatchRead, status_code=status.HTTP_201_CREATED)
def create_certificate_batch_endpoint(
    payload: CertificateBatchCreate,
    access: OrgAccess = Depends(require_org_membership(CERTIFY_ROLES)),
    db: Session = Depends(get_db),
):
    return create_certificate_batch(
        db, payload.model_copy(update={"organization_id": access.organization_id}), access.user_id
    )


@router.patch("/{certificate_batch_id}/status", response_model=CertificateBatchRead)
def update_certificate_status_endpoint(
    payload: CertificateStatusUpdate,
    certificate_batch_id: UUID = Path(...),
    access: OrgAccess = Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return update_certificate_status(db, access.organization_id, certificate_batch_id, payload, access.user_id)
