from collections.abc import Callable
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.commercial import Membership, MembershipRole, Organization
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationMembershipCreate,
    OrganizationMembershipUpdate,
)

EmailResolver = Callable[[str], UUID]


def list_organizations_for_user(db: Session, user_id: UUID) -> list[Organization]:
    statement = (
        select(Organization)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(Membership.user_id == user_id)
        .order_by(Organization.name.asc())
    )
    return list(db.scalars(statement))


def create_organization(
    db: Session,
    payload: OrganizationCreate,
    user_id: UUID,
    email: str | None = None,
) -> Organization:
    existing = db.scalar(select(Organization).where(Organization.slug == payload.slug))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization slug already exists")

    organization = Organization(name=payload.name, slug=payload.slug)
    db.add(organization)
    db.flush()

    db.add(
        Membership(
            organization_id=organization.id,
            user_id=user_id,
            email=email,
            role=MembershipRole.org_admin,
        )
    )
    db.commit()
    db.refresh(organization)
    return organization


def list_organization_memberships(
    db: Session,
    organization_id: UUID,
    contractor_user_id: UUID | None = None,
) -> list[Membership]:
    statement = select(Membership).where(Membership.organization_id == organization_id)
    if contractor_user_id is not None:
        statement = statement.where(Membership.user_id == contractor_user_id)
    statement = statement.order_by(Membership.created_at.asc(), Membership.user_id.asc())
    return list(db.scalars(statement))


def add_organization_membership(
    db: Session,
    organization_id: UUID,
    payload: OrganizationMembershipCreate,
    current_user_id: UUID,
    resolve_email: EmailResolver | None = None,
) -> Membership:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    email = str(payload.email).strip().lower() if payload.email else None
    user_id = payload.user_id
    if user_id is None:
        if resolve_email is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide the member's user id")
        user_id = resolve_email(email)

    existing_membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == user_id,
        )
    )
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="User is already a member of this organization"
        )

    membership = Membership(
        organization_id=organization_id,
        user_id=user_id,
        email=email,
        role=payload.role,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def _get_membership_or_404(db: Session, organization_id: UUID, membership_id: UUID) -> Membership:
    membership = db.scalar(
        select(Membership).where(
            Membership.id == membership_id,
            Membership.organization_id == organization_id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    return membership


def _ensure_another_admin_remains(db: Session, organization_id: UUID, membership: Membership) -> None:
    if membership.role != MembershipRole.org_admin:
        return

    admin_count = db.scalar(
        select(func.count())
        .select_from(Membership)
        .where(
            Membership.organization_id == organization_id,
            Membership.role == MembershipRole.org_admin,
        )
    )
    if admin_count == 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="At least one organization admin is required",
        )


def update_organization_membership_role(
    db: Session,
    organization_id: UUID,
    membership_id: UUID,
    payload: OrganizationMembershipUpdate,
    current_user_id: UUID,
) -> Membership:
    membership = _get_membership_or_404(db, organization_id, membership_id)

    if payload.role != MembershipRole.org_admin:
        _ensure_another_admin_remains(db, organization_id, membership)

    membership.role = payload.role
    db.commit()
    db.refresh(membership)
    return membership


def remove_organization_membership(
    db: Session,
    organization_id: UUID,
    membership_id: UUID,
) -> None:
    membership = _get_membership_or_404(db, organization_id, membership_id)
    _ensure_another_admin_remains(db, organization_id, membership)
    db.delete(membership)
    db.commit()
