from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.commercial import Contract, Membership, MembershipRole


def get_membership(db: Session, organization_id: UUID, user_id: UUID) -> Membership:
    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == user_id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No organization access")
    return membership


def get_membership_role(db: Session, organization_id: UUID, user_id: UUID) -> MembershipRole:
    return get_membership(db, organization_id, user_id).role


def contractor_scope_for(role: MembershipRole, user_id: UUID) -> UUID | None:
    return user_id if role == MembershipRole.contractor else None


def ensure_contract_visible(contract: Contract, contractor_user_id: UUID | None) -> None:
    """Subcontractors only ever see contracts they are assigned to; everyone else sees all."""
    if contractor_user_id is not None and contract.subcontractor_user_id != contractor_user_id:
        # 404 rather than 403 so a subcontractor cannot probe for other packages.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")


def get_contract(
    db: Session,
    organization_id: UUID,
    contract_id: UUID,
    *,
    project_id: UUID | None = None,
    contractor_user_id: UUID | None = None,
) -> Contract:
    statement = select(Contract).where(
        Contract.id == contract_id,
        Contract.organization_id == organization_id,
    )
    if project_id is not None:
        statement = statement.where(Contract.project_id == project_id)

    contract = db.scalar(statement)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    ensure_contract_visible(contract, contractor_user_id)
    return contract


def visible_contract_ids(organization_id: UUID, contractor_user_id: UUID):
    return select(Contract.id).where(
        Contract.organization_id == organization_id,
        Contract.subcontractor_user_id == contractor_user_id,
    )
