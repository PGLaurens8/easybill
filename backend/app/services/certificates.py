import re
from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import CERTIFY_ROLES, PAYMENT_ROLES
from app.models.commercial import (
    BoqItem,
    BoqRevision,
    CertificateBatch,
    CertificateLine,
    CertificateStatus,
    ClaimBatch,
    ClaimStatus,
    ContraCharge,
    Contract,
)
from app.schemas.certificate import (
    CertificateBatchCreate,
    CertificateBatchRead,
    CertificateLineRead,
    CertificateLineValuation,
    CertificateStatusUpdate,
    CertificateValuationRead,
    CertificateValuationRequest,
)
from app.services.access import get_contract, get_membership_role, visible_contract_ids
from app.services.audit import build_certificate_created_audit_metadata, record_audit_event
from app.services.boq import get_latest_boq_revision
from app.services.claims import apply_claim_status, claim_batch_query
from app.services.ledger import get_certified_to_date, get_latest_live_certificate
from app.services.valuation import (
    Adjustment,
    BoqLine,
    CertificateValuation,
    ClaimedLine,
    ContractTerms,
    ValuationError,
    value_certificate,
)

CERTIFIABLE_CLAIM_STATUSES = {
    ClaimStatus.approved,
    ClaimStatus.certified,
    ClaimStatus.paid,
}


def _certificate_batch_query():
    return select(CertificateBatch).options(
        selectinload(CertificateBatch.lines).selectinload(CertificateLine.boq_item)
    )


def _serialize_certificate_line(line: CertificateLine) -> CertificateLineRead:
    item = line.boq_item
    return CertificateLineRead(
        id=line.id,
        boq_item_id=line.boq_item_id,
        item_code=item.item_code if item else "",
        description=item.description if item else "",
        unit=item.unit if item else "",
        contract_quantity=item.contract_quantity if item else Decimal("0"),
        rate=line.rate,
        previous_certified_quantity=line.previous_certified_quantity,
        claimed_quantity_this_period=line.claimed_quantity_this_period,
        certified_quantity_this_period=line.certified_quantity_this_period,
        work_value_to_date=line.work_value_to_date,
        materials_on_site_value_to_date=line.materials_on_site_value_to_date,
        variation_value_to_date=line.variation_value_to_date,
        preliminaries_value_to_date=line.preliminaries_value_to_date,
        dayworks_value_to_date=line.dayworks_value_to_date,
        escalation_value_to_date=line.escalation_value_to_date,
        contra_charge_value_to_date=line.contra_charge_value_to_date,
        other_deduction_value_to_date=line.other_deduction_value_to_date,
        notes=line.notes,
    )


def serialize_certificate_batch(certificate_batch: CertificateBatch) -> CertificateBatchRead:
    lines = sorted(
        certificate_batch.lines,
        key=lambda line: line.boq_item.order_index if line.boq_item else 0,
    )
    return CertificateBatchRead(
        id=certificate_batch.id,
        organization_id=certificate_batch.organization_id,
        project_id=certificate_batch.project_id,
        contract_id=certificate_batch.contract_id,
        claim_batch_id=certificate_batch.claim_batch_id,
        certificate_number=certificate_batch.certificate_number,
        status=certificate_batch.status.value,
        issue_date=certificate_batch.issue_date,
        previous_net_certified_excl_tax=certificate_batch.previous_net_certified_excl_tax,
        gross_value_to_date=certificate_batch.gross_value_to_date,
        retention_held_to_date=certificate_batch.retention_held_to_date,
        retention_released_to_date=certificate_batch.retention_released_to_date,
        contra_charges_to_date=certificate_batch.contra_charges_to_date,
        net_certified_to_date_excl_tax=certificate_batch.net_certified_to_date_excl_tax,
        amount_due_this_certificate_excl_tax=certificate_batch.amount_due_this_certificate_excl_tax,
        tax_this_certificate=certificate_batch.tax_this_certificate,
        amount_due_this_certificate_incl_tax=certificate_batch.amount_due_this_certificate_incl_tax,
        issued_by_user_id=certificate_batch.issued_by_user_id,
        created_at=certificate_batch.created_at,
        updated_at=certificate_batch.updated_at,
        lines=[_serialize_certificate_line(line) for line in lines],
    )


def list_certificate_batches(
    db: Session,
    organization_id: UUID,
    contractor_user_id: UUID | None = None,
) -> list[CertificateBatchRead]:
    statement = _certificate_batch_query().where(CertificateBatch.organization_id == organization_id)
    if contractor_user_id is not None:
        statement = statement.where(
            CertificateBatch.contract_id.in_(visible_contract_ids(organization_id, contractor_user_id))
        )
    statement = statement.order_by(CertificateBatch.issue_date.desc(), CertificateBatch.certificate_number.desc())
    return [serialize_certificate_batch(batch) for batch in db.scalars(statement)]


def _load_certifiable_claim(db: Session, organization_id: UUID, claim_batch_id: UUID) -> ClaimBatch:
    claim_batch = db.scalar(
        claim_batch_query().where(
            ClaimBatch.id == claim_batch_id,
            ClaimBatch.organization_id == organization_id,
        )
    )
    if claim_batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    if claim_batch.status not in CERTIFIABLE_CLAIM_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Claim must be approved before a certificate can be created",
        )

    existing_claim_certificate = db.scalar(
        select(CertificateBatch).where(
            CertificateBatch.organization_id == organization_id,
            CertificateBatch.claim_batch_id == claim_batch_id,
            CertificateBatch.status != CertificateStatus.voided,
        )
    )
    if existing_claim_certificate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Certificate already exists for claim")

    return claim_batch


def retention_release_fraction(contract: Contract, issue_date: date) -> Decimal:
    """Half the retention is released from practical completion, the rest from final completion."""
    if contract.final_completion_date and contract.final_completion_date <= issue_date:
        return Decimal("1")
    if contract.practical_completion_date and contract.practical_completion_date <= issue_date:
        return Decimal("0.5")
    return Decimal("0")


def _contra_charges_up_to(db: Session, contract: Contract, issue_date: date) -> list[ContraCharge]:
    return list(
        db.scalars(
            select(ContraCharge).where(
                ContraCharge.contract_id == contract.id,
                ContraCharge.charge_date <= issue_date,
            )
        )
    )


def _value(
    db: Session,
    contract: Contract,
    claim_batch: ClaimBatch | None,
    adjustments: list,
    issue_date: date,
) -> tuple[CertificateValuation, list[ContraCharge]]:
    """Value a certificate for ``claim_batch``, or a claim-less one (e.g. retention release) on the latest BOQ."""
    if claim_batch is not None:
        if any(line.boq_item is None for line in claim_batch.lines):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Claim contains invalid BOQ item state")
        revision_ids = {line.boq_item.boq_revision_id for line in claim_batch.lines}
        if len(revision_ids) != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Claim lines span several BOQ revisions"
            )
        revision = db.scalar(
            select(BoqRevision).where(BoqRevision.id == revision_ids.pop()).options(selectinload(BoqRevision.items))
        )
        claim_lines = claim_batch.lines
    else:
        revision = get_latest_boq_revision(db, contract.organization_id, contract.id)
        if revision is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This contract has no BOQ yet")
        claim_lines = []

    boq_items: list[BoqItem] = sorted(revision.items, key=lambda item: item.order_index)
    certified = get_certified_to_date(db, contract.organization_id, contract.id)
    charges = _contra_charges_up_to(db, contract, issue_date)
    # The claim may predate a later revision (e.g. an approved variation); the contract sum, and so the
    # retention cap, always come from the latest BOQ.
    latest = get_latest_boq_revision(db, contract.organization_id, contract.id)
    contract_value = sum((Decimal(item.amount) for item in (latest or revision).items), Decimal("0"))

    try:
        valuation = value_certificate(
            terms=ContractTerms(
                retention_percent=Decimal(contract.retention_percent),
                retention_cap_percent=(
                    Decimal(contract.retention_cap_percent) if contract.retention_cap_percent is not None else None
                ),
                tax_percent=Decimal(contract.tax_percent),
                retention_release_fraction=retention_release_fraction(contract, issue_date),
            ),
            boq_lines=[
                BoqLine(
                    boq_item_id=item.id,
                    item_code=item.item_code,
                    description=item.description,
                    unit=item.unit,
                    contract_quantity=Decimal(item.contract_quantity),
                    rate=Decimal(item.rate),
                    amount=Decimal(item.amount),
                )
                for item in boq_items
            ],
            previously_certified_by_code=certified.quantity_by_item_code,
            carried_value_outside_boq=certified.carried_value_outside({item.item_code for item in boq_items}),
            claimed_lines=[
                ClaimedLine(
                    boq_item_id=line.boq_item_id,
                    claimed_quantity=Decimal(line.claimed_quantity_this_period),
                    materials_on_site_value=(
                        Decimal(line.claimed_materials_on_site_value)
                        if line.claimed_materials_on_site_value is not None
                        else None
                    ),
                    notes=line.notes,
                )
                for line in claim_lines
            ],
            adjustments={
                adjustment.boq_item_id: Adjustment(
                    certified_quantity=adjustment.certified_quantity_this_period,
                    materials_on_site_value=adjustment.certified_materials_on_site_value,
                    notes=(adjustment.notes or "").strip() or None,
                )
                for adjustment in adjustments
            },
            previous_net_certified=certified.previous_net_certified,
            contra_charges_to_date=sum((Decimal(charge.amount) for charge in charges), Decimal("0")),
            contract_value=contract_value,
        )
    except ValuationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return valuation, charges


def _resolve_subject(db: Session, payload: CertificateValuationRequest) -> tuple[Contract, ClaimBatch | None]:
    if payload.claim_batch_id is not None:
        claim_batch = _load_certifiable_claim(db, payload.organization_id, payload.claim_batch_id)
        contract = get_contract(db, payload.organization_id, claim_batch.contract_id)
        if payload.contract_id is not None and payload.contract_id != contract.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
        return contract, claim_batch
    if payload.adjustments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantities can only be adjusted on a certificate for a claim",
        )
    return get_contract(db, payload.organization_id, payload.contract_id), None


def _line_valuation_read(valuation: CertificateValuation) -> list[CertificateLineValuation]:
    return [
        CertificateLineValuation(
            boq_item_id=line.boq_line.boq_item_id,
            item_code=line.boq_line.item_code,
            description=line.boq_line.description,
            unit=line.boq_line.unit,
            rate=line.boq_line.rate,
            contract_quantity=line.boq_line.contract_quantity,
            previous_certified_quantity=line.previous_certified_quantity,
            claimed_quantity_this_period=line.claimed_quantity_this_period,
            certified_quantity_this_period=line.certified_quantity_this_period,
            work_value_to_date=line.work_value_to_date,
            materials_on_site_value_to_date=line.materials_on_site_value_to_date,
            notes=line.notes,
        )
        for line in valuation.lines
    ]


def preview_certificate(db: Session, payload: CertificateValuationRequest) -> CertificateValuationRead:
    contract, claim_batch = _resolve_subject(db, payload)
    valuation, _ = _value(db, contract, claim_batch, payload.adjustments, payload.issue_date or date.today())
    return CertificateValuationRead(
        claim_batch_id=claim_batch.id if claim_batch else None,
        contract_id=contract.id,
        contract_value=valuation.contract_value,
        previous_net_certified_excl_tax=valuation.previous_net_certified_excl_tax,
        gross_value_to_date=valuation.gross_value_to_date,
        retention_held_to_date=valuation.retention_held_to_date,
        retention_released_to_date=valuation.retention_released_to_date,
        contra_charges_to_date=valuation.contra_charges_to_date,
        net_certified_to_date_excl_tax=valuation.net_certified_to_date_excl_tax,
        amount_due_this_certificate_excl_tax=valuation.amount_due_this_certificate_excl_tax,
        tax_this_certificate=valuation.tax_this_certificate,
        amount_due_this_certificate_incl_tax=valuation.amount_due_this_certificate_incl_tax,
        lines=_line_valuation_read(valuation),
    )


def next_certificate_number(db: Session, contract_id: UUID) -> str:
    numbers = db.scalars(select(CertificateBatch.certificate_number).where(CertificateBatch.contract_id == contract_id))
    highest = 0
    for number in numbers:
        match = re.search(r"(\d+)$", number)
        if match:
            highest = max(highest, int(match.group(1)))
    return f"CERT-{highest + 1:03d}"


def create_certificate_batch(
    db: Session,
    payload: CertificateBatchCreate,
    current_user_id: UUID,
) -> CertificateBatchRead:
    contract, claim_batch = _resolve_subject(db, payload)
    if contract.project_id != payload.project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    certificate_number = (payload.certificate_number or "").strip() or next_certificate_number(db, contract.id)
    existing = db.scalar(
        select(CertificateBatch).where(
            CertificateBatch.contract_id == contract.id,
            CertificateBatch.certificate_number == certificate_number,
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Certificate number already exists")

    valuation, charges = _value(db, contract, claim_batch, payload.adjustments, payload.issue_date)

    if claim_batch is not None and claim_batch.status == ClaimStatus.approved:
        actor_role = get_membership_role(db, payload.organization_id, current_user_id)
        apply_claim_status(
            db,
            claim_batch,
            ClaimStatus.certified,
            actor_user_id=current_user_id,
            actor_role=actor_role,
        )

    certificate_batch = CertificateBatch(
        organization_id=payload.organization_id,
        project_id=payload.project_id,
        contract_id=contract.id,
        claim_batch_id=claim_batch.id if claim_batch else None,
        certificate_number=certificate_number,
        status=CertificateStatus.issued,
        issue_date=payload.issue_date,
        previous_net_certified_excl_tax=valuation.previous_net_certified_excl_tax,
        gross_value_to_date=valuation.gross_value_to_date,
        retention_held_to_date=valuation.retention_held_to_date,
        retention_released_to_date=valuation.retention_released_to_date,
        contra_charges_to_date=valuation.contra_charges_to_date,
        net_certified_to_date_excl_tax=valuation.net_certified_to_date_excl_tax,
        amount_due_this_certificate_excl_tax=valuation.amount_due_this_certificate_excl_tax,
        tax_this_certificate=valuation.tax_this_certificate,
        amount_due_this_certificate_incl_tax=valuation.amount_due_this_certificate_incl_tax,
        issued_by_user_id=current_user_id,
        # Set explicitly (with microseconds) because the ledger orders certificates by creation time.
        created_at=datetime.now(UTC),
    )
    db.add(certificate_batch)
    db.flush()

    for charge in charges:
        if charge.certificate_batch_id is None:
            charge.certificate_batch_id = certificate_batch.id

    for line in valuation.lines:
        db.add(
            CertificateLine(
                certificate_batch_id=certificate_batch.id,
                boq_item_id=line.boq_line.boq_item_id,
                claimed_quantity_this_period=line.claimed_quantity_this_period,
                certified_quantity_this_period=line.certified_quantity_this_period,
                previous_certified_quantity=line.previous_certified_quantity,
                rate=line.boq_line.rate,
                work_value_to_date=line.work_value_to_date,
                materials_on_site_value_to_date=line.materials_on_site_value_to_date,
                notes=line.notes,
            )
        )

    record_audit_event(
        db,
        organization_id=payload.organization_id,
        entity_type="CertificateBatch",
        entity_id=certificate_batch.id,
        actor_user_id=current_user_id,
        action="certificate_batch.created",
        metadata=build_certificate_created_audit_metadata(
            certificate_number=certificate_number,
            claim_batch_id=claim_batch.id if claim_batch else None,
            gross_value_to_date=valuation.gross_value_to_date,
            amount_due_this_certificate_excl_tax=valuation.amount_due_this_certificate_excl_tax,
            adjusted_line_count=len(payload.adjustments),
        ),
    )

    db.commit()
    certificate = db.scalar(_certificate_batch_query().where(CertificateBatch.id == certificate_batch.id))
    return serialize_certificate_batch(certificate)


def update_certificate_status(
    db: Session,
    organization_id: UUID,
    certificate_batch_id: UUID,
    payload: CertificateStatusUpdate,
    current_user_id: UUID,
) -> CertificateBatchRead:
    """Mark an issued certificate as paid, or void the latest certificate to correct a mistake."""
    certificate = db.scalar(
        _certificate_batch_query().where(
            CertificateBatch.id == certificate_batch_id,
            CertificateBatch.organization_id == organization_id,
        )
    )
    if certificate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    try:
        next_status = CertificateStatus(payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid certificate status") from exc

    if certificate.status != CertificateStatus.issued or next_status not in {
        CertificateStatus.paid,
        CertificateStatus.voided,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A {certificate.status.value} certificate cannot be marked {next_status.value}",
        )

    actor_role = get_membership_role(db, organization_id, current_user_id)
    allowed_roles = PAYMENT_ROLES if next_status == CertificateStatus.paid else CERTIFY_ROLES
    if actor_role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")

    if next_status == CertificateStatus.voided:
        latest = get_latest_live_certificate(db, organization_id, certificate.contract_id)
        if latest is None or latest.id != certificate.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only the most recent certificate on a contract can be voided",
            )

    claim_batch = (
        db.scalar(claim_batch_query().where(ClaimBatch.id == certificate.claim_batch_id))
        if certificate.claim_batch_id
        else None
    )
    if claim_batch is not None:
        if next_status == CertificateStatus.paid and claim_batch.status == ClaimStatus.certified:
            apply_claim_status(
                db, claim_batch, ClaimStatus.paid, actor_user_id=current_user_id, actor_role=actor_role
            )
        elif next_status == CertificateStatus.voided and claim_batch.status == ClaimStatus.certified:
            # Back to Approved so the QS can re-certify it with corrected quantities.
            apply_claim_status(
                db,
                claim_batch,
                ClaimStatus.approved,
                actor_user_id=current_user_id,
                actor_role=actor_role,
                remarks=f"Certificate {certificate.certificate_number} voided",
            )

    if next_status == CertificateStatus.voided:
        # Deductions first taken on this certificate go back to "pending" for the next one.
        for charge in db.scalars(select(ContraCharge).where(ContraCharge.certificate_batch_id == certificate.id)):
            charge.certificate_batch_id = None

    certificate.status = next_status
    record_audit_event(
        db,
        organization_id=organization_id,
        entity_type="CertificateBatch",
        entity_id=certificate.id,
        actor_user_id=current_user_id,
        action="certificate_batch.status_changed",
        metadata={"next_status": next_status.value, "actor_role": actor_role.value},
    )

    db.commit()
    db.expire_all()
    refreshed = db.scalar(_certificate_batch_query().where(CertificateBatch.id == certificate.id))
    return serialize_certificate_batch(refreshed)
