from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.commercial import BoqItem, BoqRevision, BoqRevisionStatus, ContractStatus
from app.schemas.boq_revision import BoqRevisionCreate
from app.services.access import get_contract, visible_contract_ids
from app.services.valuation import money


def list_boq_revisions(
    db: Session,
    organization_id: UUID,
    contractor_user_id: UUID | None = None,
) -> list[BoqRevision]:
    statement = (
        select(BoqRevision)
        .where(BoqRevision.organization_id == organization_id)
        .options(selectinload(BoqRevision.items))
    )
    if contractor_user_id is not None:
        statement = statement.where(
            BoqRevision.contract_id.in_(visible_contract_ids(organization_id, contractor_user_id))
        )
    revisions = list(db.scalars(statement.order_by(BoqRevision.revision_number.desc())))
    for revision in revisions:
        revision.items.sort(key=lambda item: item.order_index)
    return revisions


def get_latest_boq_revision(db: Session, organization_id: UUID, contract_id: UUID) -> BoqRevision | None:
    return db.scalar(
        select(BoqRevision)
        .where(
            BoqRevision.organization_id == organization_id,
            BoqRevision.contract_id == contract_id,
        )
        .options(selectinload(BoqRevision.items))
        .order_by(BoqRevision.revision_number.desc())
    )


def create_boq_revision(db: Session, payload: BoqRevisionCreate) -> BoqRevision:
    """Publish a new BOQ revision. It becomes the basis for claims and supersedes earlier revisions."""
    contract = get_contract(db, payload.organization_id, payload.contract_id, project_id=payload.project_id)

    latest_number = db.scalar(
        select(func.max(BoqRevision.revision_number)).where(BoqRevision.contract_id == contract.id)
    ) or 0
    revision_number = payload.revision_number or latest_number + 1

    existing = db.scalar(
        select(BoqRevision).where(
            BoqRevision.contract_id == contract.id,
            BoqRevision.revision_number == revision_number,
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Revision number already exists")
    if revision_number < latest_number:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Revision number must be higher than the current revision ({latest_number})",
        )

    for previous in db.scalars(
        select(BoqRevision).where(
            BoqRevision.contract_id == contract.id,
            BoqRevision.status == BoqRevisionStatus.published,
        )
    ):
        previous.status = BoqRevisionStatus.superseded

    now = datetime.now(UTC)
    revision = BoqRevision(
        organization_id=payload.organization_id,
        project_id=payload.project_id,
        contract_id=contract.id,
        revision_number=revision_number,
        status=BoqRevisionStatus.published,
        published_at=now,
    )
    db.add(revision)
    db.flush()

    for item in payload.items:
        db.add(
            BoqItem(
                organization_id=payload.organization_id,
                project_id=payload.project_id,
                contract_id=contract.id,
                boq_revision_id=revision.id,
                item_code=item.item_code.strip(),
                trade_code=(item.trade_code or "").strip() or None,
                description=item.description.strip(),
                unit=item.unit.strip(),
                contract_quantity=item.contract_quantity,
                rate=item.rate,
                amount=money(item.contract_quantity * item.rate),
                order_index=item.order_index,
            )
        )

    if contract.status == ContractStatus.draft:
        contract.status = ContractStatus.active

    db.commit()
    created = db.scalar(
        select(BoqRevision).where(BoqRevision.id == revision.id).options(selectinload(BoqRevision.items))
    )
    created.items.sort(key=lambda item: item.order_index)
    return created
