from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import ALLOWED_CLAIM_STATUS_TRANSITIONS, CLAIM_TRANSITION_ALLOWED_ROLES
from app.models.commercial import BoqRevision, ClaimBatch, ClaimLine, ClaimStatus, Contract, MembershipRole
from app.schemas.claim import (
    ClaimBatchCreate,
    ClaimBatchRead,
    ClaimBatchStatusUpdate,
    ClaimBatchUpdate,
    ClaimLineCreate,
    ClaimLineRead,
)
from app.services.access import (
    contractor_scope_for,
    ensure_contract_visible,
    get_contract,
    get_membership_role,
    visible_contract_ids,
)
from app.services.audit import (
    build_claim_created_audit_metadata,
    build_claim_status_audit_metadata,
    record_audit_event,
)
from app.services.boq import get_latest_boq_revision
from app.services.ledger import get_certified_to_date
from app.services.valuation import ZERO, money


def claim_batch_query():
    return select(ClaimBatch).options(selectinload(ClaimBatch.lines).selectinload(ClaimLine.boq_item))


def serialize_claim_batch(claim_batch: ClaimBatch) -> ClaimBatchRead:
    total_claimed_amount = ZERO
    lines: list[ClaimLineRead] = []

    for line in sorted(claim_batch.lines, key=lambda item: item.boq_item.order_index if item.boq_item else 0):
        if line.boq_item is None:
            continue

        line_value = money(
            Decimal(line.claimed_quantity_this_period) * Decimal(line.boq_item.rate)
            + Decimal(line.claimed_materials_on_site_value or 0)
        )
        total_claimed_amount += line_value
        lines.append(
            ClaimLineRead(
                id=line.id,
                boq_item_id=line.boq_item_id,
                item_code=line.boq_item.item_code,
                trade_code=line.boq_item.trade_code,
                description=line.boq_item.description,
                unit=line.boq_item.unit,
                rate=line.boq_item.rate,
                contract_quantity=line.boq_item.contract_quantity,
                previous_certified_quantity=line.previous_certified_quantity,
                claimed_quantity_this_period=line.claimed_quantity_this_period,
                claimed_materials_on_site_value=line.claimed_materials_on_site_value,
                line_value=line_value,
                notes=line.notes,
            )
        )

    return ClaimBatchRead(
        id=claim_batch.id,
        organization_id=claim_batch.organization_id,
        project_id=claim_batch.project_id,
        contract_id=claim_batch.contract_id,
        period_number=claim_batch.period_number,
        valuation_date=claim_batch.valuation_date,
        status=claim_batch.status.value,
        submitted_by_user_id=claim_batch.submitted_by_user_id,
        submitted_at=claim_batch.submitted_at,
        reviewed_by_user_id=claim_batch.reviewed_by_user_id,
        reviewed_at=claim_batch.reviewed_at,
        remarks=claim_batch.remarks,
        created_at=claim_batch.created_at,
        updated_at=claim_batch.updated_at,
        total_claimed_amount=money(total_claimed_amount),
        lines=lines,
    )


def ensure_allowed_claim_status_transition(current_status: ClaimStatus, next_status: ClaimStatus) -> None:
    if next_status == current_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Claim is already in {current_status.value} status",
        )

    allowed_statuses = ALLOWED_CLAIM_STATUS_TRANSITIONS[current_status]
    if next_status in allowed_statuses:
        return

    allowed_values = ", ".join(sorted(item.value for item in allowed_statuses)) or "none"
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            f"Invalid claim status transition from {current_status.value} to {next_status.value}. "
            f"Allowed next statuses: {allowed_values}"
        ),
    )


def ensure_actor_can_transition_claim(
    current_status: ClaimStatus,
    next_status: ClaimStatus,
    actor_role: MembershipRole,
) -> None:
    allowed_roles = CLAIM_TRANSITION_ALLOWED_ROLES.get((current_status, next_status), frozenset())
    if actor_role in allowed_roles:
        return

    allowed_role_values = ", ".join(sorted(role.value for role in allowed_roles)) or "none"
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            f"Role {actor_role.value} cannot transition claims from {current_status.value} to {next_status.value}. "
            f"Allowed roles: {allowed_role_values}"
        ),
    )


def list_claim_batches(
    db: Session,
    organization_id: UUID,
    contractor_user_id: UUID | None = None,
) -> list[ClaimBatchRead]:
    statement = claim_batch_query().where(ClaimBatch.organization_id == organization_id)
    if contractor_user_id is not None:
        statement = statement.where(
            ClaimBatch.contract_id.in_(visible_contract_ids(organization_id, contractor_user_id))
        )
    batches = db.scalars(statement.order_by(ClaimBatch.period_number.desc()))
    return [serialize_claim_batch(batch) for batch in batches]


def _validated_claim_lines(
    db: Session,
    organization_id: UUID,
    contract: Contract,
    lines: list[ClaimLineCreate],
) -> tuple[BoqRevision, dict[UUID, Decimal]]:
    """Check claim lines against the latest BOQ and return it with previously certified quantities."""
    latest_revision = get_latest_boq_revision(db, organization_id, contract.id)
    if latest_revision is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Create a BOQ revision before creating a claim",
        )

    items_by_id = {item.id: item for item in latest_revision.items}
    if not items_by_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latest BOQ revision has no items to claim against",
        )

    boq_item_ids = [line.boq_item_id for line in lines]
    if len(boq_item_ids) != len(set(boq_item_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claim cannot contain duplicate BOQ items",
        )

    certified = get_certified_to_date(db, organization_id, contract.id)
    previous_by_item: dict[UUID, Decimal] = {}

    for line in lines:
        boq_item = items_by_id.get(line.boq_item_id)
        if boq_item is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Claims must use BOQ items from the latest revision of the selected contract",
            )

        if line.claimed_quantity_this_period == 0 and (line.claimed_materials_on_site_value or 0) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each claim line must include a quantity or materials-on-site value",
            )

        previous = certified.quantity_by_item_code.get(boq_item.item_code, ZERO)
        previous_by_item[boq_item.id] = previous

        if previous + line.claimed_quantity_this_period > Decimal(boq_item.contract_quantity):
            remaining = Decimal(boq_item.contract_quantity) - previous
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Claim quantity for BOQ item {boq_item.item_code} exceeds the contract quantity on the latest "
                    f"revision (remaining {remaining.normalize():f} {boq_item.unit})"
                ),
            )

    return latest_revision, previous_by_item


def _add_claim_lines(
    db: Session,
    claim_batch_id: UUID,
    lines: list[ClaimLineCreate],
    previous_by_item: dict[UUID, Decimal],
) -> None:
    for line in lines:
        db.add(
            ClaimLine(
                claim_batch_id=claim_batch_id,
                boq_item_id=line.boq_item_id,
                previous_certified_quantity=previous_by_item.get(line.boq_item_id, ZERO),
                claimed_quantity_this_period=line.claimed_quantity_this_period,
                claimed_materials_on_site_value=line.claimed_materials_on_site_value,
                notes=(line.notes or "").strip() or None,
            )
        )


def next_claim_period_number(db: Session, contract_id: UUID) -> int:
    latest = db.scalar(select(func.max(ClaimBatch.period_number)).where(ClaimBatch.contract_id == contract_id))
    return (latest or 0) + 1


def create_claim_batch(db: Session, payload: ClaimBatchCreate, current_user_id: UUID) -> ClaimBatchRead:
    role = get_membership_role(db, payload.organization_id, current_user_id)
    contract = get_contract(
        db,
        payload.organization_id,
        payload.contract_id,
        project_id=payload.project_id,
        contractor_user_id=contractor_scope_for(role, current_user_id),
    )

    period_number = payload.period_number or next_claim_period_number(db, contract.id)
    existing = db.scalar(
        select(ClaimBatch).where(
            ClaimBatch.contract_id == contract.id,
            ClaimBatch.period_number == period_number,
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Claim period already exists")

    latest_revision, previous_by_item = _validated_claim_lines(db, payload.organization_id, contract, payload.lines)

    claim_batch = ClaimBatch(
        organization_id=payload.organization_id,
        project_id=payload.project_id,
        contract_id=contract.id,
        period_number=period_number,
        valuation_date=payload.valuation_date or date.today(),
        status=ClaimStatus.draft,
        remarks=payload.remarks,
    )
    db.add(claim_batch)
    db.flush()
    _add_claim_lines(db, claim_batch.id, payload.lines, previous_by_item)

    record_audit_event(
        db,
        organization_id=payload.organization_id,
        entity_type="ClaimBatch",
        entity_id=claim_batch.id,
        actor_user_id=current_user_id,
        action="claim_batch.created",
        metadata=build_claim_created_audit_metadata(
            period_number=period_number,
            project_id=payload.project_id,
            contract_id=contract.id,
            revision_number=latest_revision.revision_number,
            line_count=len(payload.lines),
        ),
    )

    db.commit()
    claim = db.scalar(claim_batch_query().where(ClaimBatch.id == claim_batch.id))
    return serialize_claim_batch(claim)


def _get_claim_for_actor(
    db: Session,
    organization_id: UUID,
    claim_batch_id: UUID,
    current_user_id: UUID,
) -> tuple[ClaimBatch, MembershipRole]:
    claim_batch = db.scalar(
        claim_batch_query().where(
            ClaimBatch.id == claim_batch_id,
            ClaimBatch.organization_id == organization_id,
        )
    )
    if claim_batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    actor_role = get_membership_role(db, organization_id, current_user_id)
    contractor_scope = contractor_scope_for(actor_role, current_user_id)
    if contractor_scope is not None:
        contract = db.get(Contract, claim_batch.contract_id)
        try:
            ensure_contract_visible(contract, contractor_scope)
        except HTTPException as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found") from exc

    return claim_batch, actor_role


def update_claim_batch(
    db: Session,
    organization_id: UUID,
    claim_batch_id: UUID,
    payload: ClaimBatchUpdate,
    current_user_id: UUID,
) -> ClaimBatchRead:
    claim_batch, _ = _get_claim_for_actor(db, organization_id, claim_batch_id, current_user_id)
    if claim_batch.status != ClaimStatus.draft:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft claims can be edited. Reopen a rejected claim to edit it.",
        )

    contract = db.get(Contract, claim_batch.contract_id)
    _, previous_by_item = _validated_claim_lines(db, organization_id, contract, payload.lines)

    db.execute(delete(ClaimLine).where(ClaimLine.claim_batch_id == claim_batch.id))
    _add_claim_lines(db, claim_batch.id, payload.lines, previous_by_item)
    claim_batch.remarks = payload.remarks
    if payload.valuation_date is not None:
        claim_batch.valuation_date = payload.valuation_date

    record_audit_event(
        db,
        organization_id=organization_id,
        entity_type="ClaimBatch",
        entity_id=claim_batch.id,
        actor_user_id=current_user_id,
        action="claim_batch.updated",
        metadata={"line_count": len(payload.lines)},
    )

    db.commit()
    db.expire_all()
    claim = db.scalar(claim_batch_query().where(ClaimBatch.id == claim_batch.id))
    return serialize_claim_batch(claim)


def apply_claim_status(
    db: Session,
    claim_batch: ClaimBatch,
    next_status: ClaimStatus,
    *,
    actor_user_id: UUID,
    actor_role: MembershipRole,
    remarks: str | None = None,
) -> None:
    """Move a claim to ``next_status`` and record the audit trail. Caller commits."""
    previous_status = claim_batch.status
    claim_batch.status = next_status
    if remarks is not None:
        claim_batch.remarks = remarks

    now = datetime.now(UTC)
    if next_status == ClaimStatus.submitted:
        claim_batch.submitted_at = now
        claim_batch.submitted_by_user_id = actor_user_id
        claim_batch.reviewed_at = None
        claim_batch.reviewed_by_user_id = None
    elif next_status in {ClaimStatus.under_review, ClaimStatus.approved, ClaimStatus.rejected}:
        claim_batch.reviewed_at = now
        claim_batch.reviewed_by_user_id = actor_user_id
    elif next_status == ClaimStatus.draft:
        claim_batch.submitted_at = None
        claim_batch.submitted_by_user_id = None
        claim_batch.reviewed_at = None
        claim_batch.reviewed_by_user_id = None
    elif next_status in {ClaimStatus.certified, ClaimStatus.paid} and claim_batch.reviewed_at is None:
        claim_batch.reviewed_at = now
        claim_batch.reviewed_by_user_id = actor_user_id

    record_audit_event(
        db,
        organization_id=claim_batch.organization_id,
        entity_type="ClaimBatch",
        entity_id=claim_batch.id,
        actor_user_id=actor_user_id,
        action="claim_batch.status_changed",
        metadata=build_claim_status_audit_metadata(
            previous_status=previous_status,
            next_status=next_status,
            actor_role=actor_role,
            remarks_present=remarks is not None,
            remarks=remarks,
        ),
    )


def update_claim_batch_status(
    db: Session,
    organization_id: UUID,
    claim_batch_id: UUID,
    payload: ClaimBatchStatusUpdate,
    current_user_id: UUID,
) -> ClaimBatchRead:
    claim_batch, actor_role = _get_claim_for_actor(db, organization_id, claim_batch_id, current_user_id)

    try:
        next_status = ClaimStatus(payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid claim status") from exc

    ensure_allowed_claim_status_transition(claim_batch.status, next_status)
    ensure_actor_can_transition_claim(claim_batch.status, next_status, actor_role)

    remarks = (payload.remarks or "").strip() or None
    if next_status == ClaimStatus.rejected and remarks is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Give the subcontractor a reason when rejecting a claim",
        )

    apply_claim_status(
        db,
        claim_batch,
        next_status,
        actor_user_id=current_user_id,
        actor_role=actor_role,
        remarks=remarks,
    )

    db.commit()
    db.refresh(claim_batch)
    return serialize_claim_batch(claim_batch)
