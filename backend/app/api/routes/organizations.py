from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_org_membership
from app.core.permissions import ORG_ADMIN_ROLES
from app.db.session import get_db
from app.schemas.auth import CurrentUser, OrgAccess
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationMembershipCreate,
    OrganizationMembershipRead,
    OrganizationMembershipUpdate,
    OrganizationRead,
)
from app.services.identity import resolve_user_id_by_email
from app.services.organizations import (
    add_organization_membership,
    create_organization,
    list_organization_memberships,
    list_organizations_for_user,
    remove_organization_membership,
    update_organization_membership_role,
)

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
    return create_organization(db, payload, current_user.id, current_user.email)


@router.get("/{organization_id}/memberships", response_model=list[OrganizationMembershipRead])
def list_organization_memberships_endpoint(
    organization_id: UUID,
    access: OrgAccess = Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return list_organization_memberships(db, organization_id, access.contractor_scope)


@router.post(
    "/{organization_id}/memberships",
    response_model=OrganizationMembershipRead,
    status_code=status.HTTP_201_CREATED,
)
def add_organization_membership_endpoint(
    organization_id: UUID,
    payload: OrganizationMembershipCreate,
    access: OrgAccess = Depends(require_org_membership(ORG_ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    return add_organization_membership(
        db, organization_id, payload, access.user_id, resolve_email=resolve_user_id_by_email
    )


@router.patch("/{organization_id}/memberships/{membership_id}", response_model=OrganizationMembershipRead)
def update_organization_membership_endpoint(
    organization_id: UUID,
    membership_id: UUID,
    payload: OrganizationMembershipUpdate,
    access: OrgAccess = Depends(require_org_membership(ORG_ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    return update_organization_membership_role(db, organization_id, membership_id, payload, access.user_id)


@router.delete("/{organization_id}/memberships/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_organization_membership_endpoint(
    organization_id: UUID,
    membership_id: UUID,
    access: OrgAccess = Depends(require_org_membership(ORG_ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    remove_organization_membership(db, organization_id, membership_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
