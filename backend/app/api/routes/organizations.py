from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.schemas.auth import CurrentUser
from app.schemas.organization import OrganizationCreate, OrganizationRead
from app.services.commercial import create_organization, list_organizations_for_user

router = APIRouter()


@router.get("", response_model=list[OrganizationRead])
def list_organizations(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_organizations_for_user(db, current_user.id)


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
def create_organization_endpoint(
    payload: OrganizationCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_organization(db, payload, current_user.id)
