from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_org_membership
from app.db.session import get_db
from app.models.commercial import MembershipRole
from app.schemas.auth import CurrentUser
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationMembershipCreate,
    OrganizationMembershipRead,
    OrganizationMembershipUpdate,
    OrganizationRead,
)
from app.services.commercial import (
    add_organization_membership,
    create_organization,
    list_organization_memberships,
    list_organizations_for_user,
    update_organization_membership_role,
)

router = APIRouter()
organization_admin_roles = {MembershipRole.org_admin}


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


@router.get("/{organization_id}/memberships", response_model=list[OrganizationMembershipRead])
def list_organization_memberships_endpoint(
    organization_id: UUID,
    _: UUID = Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return list_organization_memberships(db, organization_id)


@router.post(
    "/{organization_id}/memberships",
    response_model=OrganizationMembershipRead,
    status_code=status.HTTP_201_CREATED,
)
def add_organization_membership_endpoint(
    organization_id: UUID,
    payload: OrganizationMembershipCreate,
    current_user: CurrentUser = Depends(get_current_user),
    _: UUID = Depends(require_org_membership(organization_admin_roles)),
    db: Session = Depends(get_db),
):
    return add_organization_membership(db, organization_id, payload, current_user.id)


@router.patch("/{organization_id}/memberships/{membership_id}", response_model=OrganizationMembershipRead)
def update_organization_membership_endpoint(
    organization_id: UUID,
    membership_id: UUID,
    payload: OrganizationMembershipUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    _: UUID = Depends(require_org_membership(organization_admin_roles)),
    db: Session = Depends(get_db),
):
    return update_organization_membership_role(db, organization_id, membership_id, payload, current_user.id)
