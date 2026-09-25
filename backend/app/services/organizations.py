from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.commercial import InvitationStatus, Membership, MembershipRole, Organization, OrganizationInvitation
from app.schemas.auth import CurrentUser
from app.schemas.organization import (
    MyInvitationRead,
    OrganizationCreate,
    OrganizationInvitationCreate,
    OrganizationMembershipCreate,
    OrganizationMembershipUpdate,
)


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
) -> Membership:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    existing_membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == payload.user_id,
        )
    )
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="User is already a member of this organization"
        )

    membership = Membership(
        organization_id=organization_id,
        user_id=payload.user_id,
        email=payload.email.strip().lower() if payload.email else None,
        role=payload.role,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


# Invitations --------------------------------------------------------------------------------


def create_invitation(
    db: Session,
    organization_id: UUID,
    payload: OrganizationInvitationCreate,
    invited_by_user_id: UUID,
) -> OrganizationInvitation:
    email = str(payload.email).strip().lower()

    already_member = db.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            func.lower(Membership.email) == email,
        )
    )
    if already_member:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That person is already a member")

    pending = db.scalar(
        select(OrganizationInvitation).where(
            OrganizationInvitation.organization_id == organization_id,
            OrganizationInvitation.email == email,
            OrganizationInvitation.status == InvitationStatus.pending,
        )
    )
    if pending:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That email already has a pending invitation")

    invitation = OrganizationInvitation(
        organization_id=organization_id,
        email=email,
        role=payload.role,
        status=InvitationStatus.pending,
        invited_by_user_id=invited_by_user_id,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


def list_pending_invitations(db: Session, organization_id: UUID) -> list[OrganizationInvitation]:
    return list(
        db.scalars(
            select(OrganizationInvitation)
            .where(
                OrganizationInvitation.organization_id == organization_id,
                OrganizationInvitation.status == InvitationStatus.pending,
            )
            .order_by(OrganizationInvitation.created_at.desc())
        )
    )


def revoke_invitation(db: Session, organization_id: UUID, invitation_id: UUID, actor_user_id: UUID) -> None:
    invitation = db.scalar(
        select(OrganizationInvitation).where(
            OrganizationInvitation.id == invitation_id,
            OrganizationInvitation.organization_id == organization_id,
            OrganizationInvitation.status == InvitationStatus.pending,
        )
    )
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    invitation.status = InvitationStatus.revoked
    invitation.responded_by_user_id = actor_user_id
    invitation.responded_at = datetime.now(UTC)
    db.commit()


def list_my_invitations(db: Session, user: CurrentUser) -> list[MyInvitationRead]:
    if not user.email or not user.email_confirmed:
        return []
    rows = db.execute(
        select(OrganizationInvitation, Organization.name)
        .join(Organization, Organization.id == OrganizationInvitation.organization_id)
        .where(
            OrganizationInvitation.email == user.email.lower(),
            OrganizationInvitation.status == InvitationStatus.pending,
        )
        .order_by(OrganizationInvitation.created_at.desc())
    ).all()
    return [
        MyInvitationRead(
            id=invitation.id,
            organization_id=invitation.organization_id,
            organization_name=name,
            role=invitation.role,
            created_at=invitation.created_at,
        )
        for invitation, name in rows
    ]


def respond_to_invitation(db: Session, invitation_id: UUID, user: CurrentUser, *, accept: bool) -> Membership | None:
    invitation = db.get(OrganizationInvitation, invitation_id)
    # Same 404 for "not yours" and "does not exist" so invitation ids cannot be probed.
    if (
        invitation is None
        or invitation.status != InvitationStatus.pending
        or not user.email
        or invitation.email != user.email.lower()
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    if not user.email_confirmed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Confirm your email address before accepting invitations",
        )

    invitation.responded_by_user_id = user.id
    invitation.responded_at = datetime.now(UTC)
    if not accept:
        invitation.status = InvitationStatus.declined
        db.commit()
        return None

    invitation.status = InvitationStatus.accepted
    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == invitation.organization_id,
            Membership.user_id == user.id,
        )
    )
    if membership is None:
        membership = Membership(
            organization_id=invitation.organization_id,
            user_id=user.id,
            email=invitation.email,
            role=invitation.role,
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
