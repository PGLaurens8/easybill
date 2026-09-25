from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_org_membership
from app.core.permissions import COMMERCIAL_WRITE_ROLES
from app.db.session import get_db
from app.schemas.auth import OrgAccess
from app.schemas.project import ProjectCreate, ProjectRead
from app.services.projects import create_project, list_projects

router = APIRouter()


@router.get("", response_model=list[ProjectRead])
def list_projects_endpoint(
    access: OrgAccess = Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return list_projects(db, access.organization_id, access.contractor_scope)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project_endpoint(
    payload: ProjectCreate,
    access: OrgAccess = Depends(require_org_membership(COMMERCIAL_WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    return create_project(db, payload.model_copy(update={"organization_id": access.organization_id}))
