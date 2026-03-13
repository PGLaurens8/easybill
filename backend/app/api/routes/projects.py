from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_org_membership
from app.db.session import get_db
from app.models.commercial import MembershipRole
from app.schemas.project import ProjectCreate, ProjectRead
from app.services.commercial import create_project, list_projects

router = APIRouter()

commercial_write_roles = {
    MembershipRole.org_admin,
    MembershipRole.commercial_manager,
    MembershipRole.quantity_surveyor,
}


@router.get("", response_model=list[ProjectRead])
def list_projects_endpoint(
    organization_id=Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return list_projects(db, organization_id)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project_endpoint(
    payload: ProjectCreate,
    organization_id=Depends(require_org_membership(commercial_write_roles)),
    db: Session = Depends(get_db),
):
    if payload.organization_id != organization_id:
        payload = payload.model_copy(update={"organization_id": organization_id})
    return create_project(db, payload)
