from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_org_membership
from app.db.session import get_db
from app.models.commercial import MembershipRole
from app.schemas.boq_revision import BoqRevisionCreate, BoqRevisionRead
from app.services.commercial import create_boq_revision, list_boq_revisions

router = APIRouter()

commercial_write_roles = {
    MembershipRole.org_admin,
    MembershipRole.commercial_manager,
    MembershipRole.quantity_surveyor,
}


@router.get("", response_model=list[BoqRevisionRead])
def list_boq_revisions_endpoint(
    organization_id=Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return list_boq_revisions(db, organization_id)


@router.post("", response_model=BoqRevisionRead, status_code=status.HTTP_201_CREATED)
def create_boq_revision_endpoint(
    payload: BoqRevisionCreate,
    organization_id=Depends(require_org_membership(commercial_write_roles)),
    db: Session = Depends(get_db),
):
    if payload.organization_id != organization_id:
        payload = payload.model_copy(update={"organization_id": organization_id})
    return create_boq_revision(db, payload)
