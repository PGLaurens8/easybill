from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_org_membership
from app.core.permissions import CLAIM_PREPARE_ROLES, COMMERCIAL_WRITE_ROLES
from app.db.session import get_db
from app.schemas.auth import OrgAccess
from app.schemas.variation import (
    ContraChargeCreate,
    ContraChargeRead,
    VariationDecision,
    VariationOrderCreate,
    VariationOrderRead,
)
from app.services.variations import (
    create_contra_charge,
    create_variation,
    decide_variation,
    delete_contra_charge,
    list_contra_charges,
    list_variations,
)

variations_router = APIRouter()
contra_charges_router = APIRouter()


@variations_router.get("", response_model=list[VariationOrderRead])
def list_variations_endpoint(access: OrgAccess = Depends(require_org_membership()), db: Session = Depends(get_db)):
    return list_variations(db, access)


@variations_router.post("", response_model=VariationOrderRead, status_code=status.HTTP_201_CREATED)
def create_variation_endpoint(
    payload: VariationOrderCreate,
    access: OrgAccess = Depends(require_org_membership(CLAIM_PREPARE_ROLES)),
    db: Session = Depends(get_db),
):
    return create_variation(db, payload, access)


@variations_router.post("/{variation_id}/decision", response_model=VariationOrderRead)
def decide_variation_endpoint(
    variation_id: UUID,
    payload: VariationDecision,
    access: OrgAccess = Depends(require_org_membership()),
    db: Session = Depends(get_db),
):
    return decide_variation(db, variation_id, payload, access)


@contra_charges_router.get("", response_model=list[ContraChargeRead])
def list_contra_charges_endpoint(access: OrgAccess = Depends(require_org_membership()), db: Session = Depends(get_db)):
    return list_contra_charges(db, access)


@contra_charges_router.post("", response_model=ContraChargeRead, status_code=status.HTTP_201_CREATED)
def create_contra_charge_endpoint(
    payload: ContraChargeCreate,
    access: OrgAccess = Depends(require_org_membership(COMMERCIAL_WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    return create_contra_charge(db, payload, access)


@contra_charges_router.delete("/{charge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contra_charge_endpoint(
    charge_id: UUID,
    access: OrgAccess = Depends(require_org_membership(COMMERCIAL_WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    delete_contra_charge(db, charge_id, access)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
