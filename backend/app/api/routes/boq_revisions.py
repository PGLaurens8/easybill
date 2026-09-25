from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_org_membership
from app.core.permissions import COMMERCIAL_WRITE_ROLES
from app.db.session import get_db
from app.schemas.auth import OrgAccess
from app.schemas.boq_revision import BoqRevisionCreate, BoqRevisionRead
from app.services.boq import create_boq_revision, list_boq_revisions

router = APIRouter()


@router.get("", response_model=list[BoqRevisionRead])
def list_boq_revisions_endpoint(
    access: OrgAccess = Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return list_boq_revisions(db, access.organization_id, access.contractor_scope)


@router.post("", response_model=BoqRevisionRead, status_code=status.HTTP_201_CREATED)
def create_boq_revision_endpoint(
    payload: BoqRevisionCreate,
    access: OrgAccess = Depends(require_org_membership(COMMERCIAL_WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    return create_boq_revision(db, payload.model_copy(update={"organization_id": access.organization_id}))
