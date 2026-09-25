"""Variation orders and contra-charges (deductions) on a contract."""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import COMMERCIAL_WRITE_ROLES, REVIEW_ROLES
from app.models.commercial import ContraCharge, VariationOrder, VariationStatus
from app.schemas.auth import OrgAccess
from app.schemas.boq_revision import BoqItemCreate, BoqRevisionCreate
from app.schemas.variation import (
    ContraChargeCreate,
    VariationDecision,
    VariationItem,
    VariationOrderCreate,
    VariationOrderRead,
)
from app.services.access import get_contract, visible_contract_ids
from app.services.audit import record_audit_event
from app.services.boq import create_boq_revision, get_latest_boq_revision
from app.services.valuation import money


def _variation_value(items: list[dict]) -> Decimal:
    return money(sum((Decimal(str(item["quantity"])) * Decimal(str(item["rate"])) for item in items), Decimal("0")))


def serialize_variation(variation: VariationOrder) -> VariationOrderRead:
    return VariationOrderRead(
        id=variation.id,
        organization_id=variation.organization_id,
        project_id=variation.project_id,
        contract_id=variation.contract_id,
        number=variation.number,
        title=variation.title,
        description=variation.description,
        status=variation.status.value,
        items=[VariationItem(**item) for item in variation.items],
        value=_variation_value(variation.items),
        submitted_by_user_id=variation.submitted_by_user_id,
        decided_by_user_id=variation.decided_by_user_id,
        decided_at=variation.decided_at,
        decision_remarks=variation.decision_remarks,
        created_at=variation.created_at,
    )


def list_variations(db: Session, access: OrgAccess) -> list[VariationOrderRead]:
    statement = select(VariationOrder).where(VariationOrder.organization_id == access.organization_id)
    if access.contractor_scope is not None:
        statement = statement.where(
            VariationOrder.contract_id.in_(visible_contract_ids(access.organization_id, access.contractor_scope))
        )
    rows = db.scalars(statement.order_by(VariationOrder.contract_id, VariationOrder.number))
    return [serialize_variation(row) for row in rows]


def _next_variation_number(db: Session, contract_id: UUID) -> str:
    numbers = db.scalars(select(VariationOrder.number).where(VariationOrder.contract_id == contract_id))
    highest = max((int(number.split("-")[-1]) for number in numbers if number.split("-")[-1].isdigit()), default=0)
    return f"VO-{highest + 1:03d}"


def _incorporate_into_boq(db: Session, variation: VariationOrder) -> None:
    """Publish a new BOQ revision containing the current BOQ plus the variation's lines."""
    latest = get_latest_boq_revision(db, variation.organization_id, variation.contract_id)
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Load the contract BOQ before approving variations",
        )

    existing = sorted(latest.items, key=lambda item: item.order_index)
    existing_codes = {item.item_code.lower() for item in existing}
    clash = next((item["item_code"] for item in variation.items if item["item_code"].lower() in existing_codes), None)
    if clash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Item code {clash} is already in the BOQ. Use codes like {variation.number}.1",
        )

    items = [
        BoqItemCreate(
            item_code=item.item_code,
            trade_code=item.trade_code,
            description=item.description,
            unit=item.unit,
            contract_quantity=Decimal(item.contract_quantity),
            rate=Decimal(item.rate),
            order_index=index,
            variation_order_id=item.variation_order_id,
        )
        for index, item in enumerate(existing)
    ]
    items += [
        BoqItemCreate(
            item_code=item["item_code"],
            trade_code=variation.number,
            description=item["description"],
            unit=item["unit"],
            contract_quantity=Decimal(str(item["quantity"])),
            rate=Decimal(str(item["rate"])),
            order_index=len(items) + offset,
            variation_order_id=variation.id,
        )
        for offset, item in enumerate(variation.items)
    ]

    revision = create_boq_revision(
        db,
        BoqRevisionCreate(
            organization_id=variation.organization_id,
            project_id=variation.project_id,
            contract_id=variation.contract_id,
            items=items,
        ),
    )
    variation.boq_revision_id = revision.id
    db.commit()


def _approve(db: Session, variation: VariationOrder, actor: OrgAccess, remarks: str | None) -> None:
    variation.status = VariationStatus.approved
    variation.decided_by_user_id = actor.user_id
    variation.decided_at = datetime.now(UTC)
    variation.decision_remarks = remarks
    record_audit_event(
        db,
        organization_id=variation.organization_id,
        entity_type="VariationOrder",
        entity_id=variation.id,
        actor_user_id=actor.user_id,
        action="variation_order.approved",
        metadata={"number": variation.number, "value": str(_variation_value(variation.items))},
    )
    # create_boq_revision commits, so the approval and the new BOQ revision land together.
    _incorporate_into_boq(db, variation)


def create_variation(db: Session, payload: VariationOrderCreate, actor: OrgAccess) -> VariationOrderRead:
    contract = get_contract(db, actor.organization_id, payload.contract_id, contractor_user_id=actor.contractor_scope)
    if payload.approve_now and actor.role not in COMMERCIAL_WRITE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the QS team can approve variations")

    variation = VariationOrder(
        organization_id=actor.organization_id,
        project_id=contract.project_id,
        contract_id=contract.id,
        number=_next_variation_number(db, contract.id),
        title=payload.title.strip(),
        description=(payload.description or "").strip() or None,
        status=VariationStatus.submitted,
        items=[item.model_dump(mode="json") for item in payload.items],
        submitted_by_user_id=actor.user_id,
    )
    db.add(variation)
    db.flush()
    record_audit_event(
        db,
        organization_id=actor.organization_id,
        entity_type="VariationOrder",
        entity_id=variation.id,
        actor_user_id=actor.user_id,
        action="variation_order.submitted",
        metadata={"number": variation.number, "value": str(_variation_value(variation.items))},
    )

    if payload.approve_now:
        _approve(db, variation, actor, None)
    else:
        db.commit()
    db.refresh(variation)
    return serialize_variation(variation)


def decide_variation(
    db: Session, variation_id: UUID, decision: VariationDecision, actor: OrgAccess
) -> VariationOrderRead:
    if actor.role not in REVIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the QS team can decide variations")

    variation = db.scalar(
        select(VariationOrder).where(
            VariationOrder.id == variation_id,
            VariationOrder.organization_id == actor.organization_id,
        )
    )
    if variation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variation not found")
    if variation.status != VariationStatus.submitted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=f"Variation is already {variation.status.value}"
        )

    remarks = (decision.remarks or "").strip() or None
    if decision.approve:
        _approve(db, variation, actor, remarks)
    else:
        if remarks is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Give the subcontractor a reason when rejecting"
            )
        variation.status = VariationStatus.rejected
        variation.decided_by_user_id = actor.user_id
        variation.decided_at = datetime.now(UTC)
        variation.decision_remarks = remarks
        record_audit_event(
            db,
            organization_id=variation.organization_id,
            entity_type="VariationOrder",
            entity_id=variation.id,
            actor_user_id=actor.user_id,
            action="variation_order.rejected",
            metadata={"number": variation.number, "remarks": remarks},
        )
        db.commit()
    db.refresh(variation)
    return serialize_variation(variation)


# Contra-charges -------------------------------------------------------------------------


def list_contra_charges(db: Session, access: OrgAccess) -> list[ContraCharge]:
    statement = select(ContraCharge).where(ContraCharge.organization_id == access.organization_id)
    if access.contractor_scope is not None:
        statement = statement.where(
            ContraCharge.contract_id.in_(visible_contract_ids(access.organization_id, access.contractor_scope))
        )
    return list(db.scalars(statement.order_by(ContraCharge.charge_date.desc(), ContraCharge.created_at.desc())))


def create_contra_charge(db: Session, payload: ContraChargeCreate, actor: OrgAccess) -> ContraCharge:
    contract = get_contract(db, actor.organization_id, payload.contract_id)
    charge = ContraCharge(
        organization_id=actor.organization_id,
        project_id=contract.project_id,
        contract_id=contract.id,
        description=payload.description.strip(),
        amount=money(payload.amount),
        charge_date=payload.charge_date or date.today(),
        created_by_user_id=actor.user_id,
    )
    db.add(charge)
    db.flush()
    record_audit_event(
        db,
        organization_id=actor.organization_id,
        entity_type="ContraCharge",
        entity_id=charge.id,
        actor_user_id=actor.user_id,
        action="contra_charge.created",
        metadata={"contract_id": str(contract.id), "amount": str(charge.amount)},
    )
    db.commit()
    db.refresh(charge)
    return charge


def delete_contra_charge(db: Session, charge_id: UUID, actor: OrgAccess) -> None:
    charge = db.scalar(
        select(ContraCharge).where(
            ContraCharge.id == charge_id,
            ContraCharge.organization_id == actor.organization_id,
        )
    )
    if charge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deduction not found")
    if charge.certificate_batch_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This deduction is on an issued certificate. Void that certificate first.",
        )
    record_audit_event(
        db,
        organization_id=actor.organization_id,
        entity_type="ContraCharge",
        entity_id=charge.id,
        actor_user_id=actor.user_id,
        action="contra_charge.deleted",
        metadata={"amount": str(charge.amount), "description": charge.description[:200]},
    )
    db.delete(charge)
    db.commit()
