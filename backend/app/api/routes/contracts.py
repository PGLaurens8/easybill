from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_org_membership
from app.core.permissions import COMMERCIAL_WRITE_ROLES
from app.db.session import get_db
from app.schemas.auth import OrgAccess
from app.schemas.contract import ContractCreate, ContractRead, ContractUpdate
from app.services.projects import create_contract, list_contracts, update_contract

router = APIRouter()


@router.get("", response_model=list[ContractRead])
def list_contracts_endpoint(
    access: OrgAccess = Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return list_contracts(db, access.organization_id, access.contractor_scope)


@router.post("", response_model=ContractRead, status_code=status.HTTP_201_CREATED)
def create_contract_endpoint(
    payload: ContractCreate,
    access: OrgAccess = Depends(require_org_membership(COMMERCIAL_WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    return create_contract(db, payload.model_copy(update={"organization_id": access.organization_id}))


@router.patch("/{contract_id}", response_model=ContractRead)
def update_contract_endpoint(
    contract_id: UUID,
    payload: ContractUpdate,
    access: OrgAccess = Depends(require_org_membership(COMMERCIAL_WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    return update_contract(db, access.organization_id, contract_id, payload)
