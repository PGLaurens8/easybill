"""Invitations addressed to the signed-in user (no organization header needed)."""

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.schemas.auth import CurrentUser
from app.schemas.organization import MyInvitationRead, OrganizationMembershipRead
from app.services.organizations import list_my_invitations, respond_to_invitation

router = APIRouter()


@router.get("", response_model=list[MyInvitationRead])
def list_my_invitations_endpoint(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_my_invitations(db, current_user)


@router.post("/{invitation_id}/accept", response_model=OrganizationMembershipRead)
def accept_invitation_endpoint(
    invitation_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return respond_to_invitation(db, invitation_id, current_user, accept=True)


@router.post("/{invitation_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
def decline_invitation_endpoint(
    invitation_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    respond_to_invitation(db, invitation_id, current_user, accept=False)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
