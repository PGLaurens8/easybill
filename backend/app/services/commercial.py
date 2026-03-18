from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.commercial import (
    BoqItem,
    BoqRevision,
    BoqRevisionStatus,
    ClaimBatch,
    ClaimLine,
    ClaimStatus,
    Contract,
    ContractStatus,
    Membership,
    MembershipRole,
    Organization,
    Project,
    ProjectStatus,
)
from app.schemas.claim import ClaimBatchCreate, ClaimBatchRead, ClaimBatchStatusUpdate, ClaimLineRead
from app.schemas.boq_revision import BoqRevisionCreate
from app.schemas.contract import ContractCreate
from app.schemas.organization import OrganizationCreate
from app.schemas.project import ProjectCreate


def list_organizations_for_user(db: Session, user_id: UUID) -> list[Organization]:
    statement = (
        select(Organization)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(Membership.user_id == user_id)
        .order_by(Organization.name.asc())
    )
    return list(db.scalars(statement))


def create_organization(db: Session, payload: OrganizationCreate, user_id: UUID) -> Organization:
    existing = db.scalar(select(Organization).where(Organization.slug == payload.slug))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization slug already exists")

    organization = Organization(name=payload.name, slug=payload.slug)
    db.add(organization)
    db.flush()

    membership = Membership(
        organization_id=organization.id,
        user_id=user_id,
        role=MembershipRole.org_admin,
    )
    db.add(membership)
    db.commit()
    db.refresh(organization)
    return organization


def list_projects(db: Session, organization_id: UUID) -> list[Project]:
    statement = (
        select(Project)
        .where(Project.organization_id == organization_id)
        .order_by(Project.code.asc())
    )
    return list(db.scalars(statement))


def create_project(db: Session, payload: ProjectCreate) -> Project:
    existing = db.scalar(
        select(Project).where(
            Project.organization_id == payload.organization_id,
            Project.code == payload.code,
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Project code already exists")

    project = Project(
        organization_id=payload.organization_id,
        code=payload.code,
        name=payload.name,
        description=payload.description,
        client_name=payload.client_name,
        currency_code=payload.currency_code.upper(),
        retention_percent_default=payload.retention_percent_default,
        tax_percent_default=payload.tax_percent_default,
        status=ProjectStatus.planned,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def list_contracts(db: Session, organization_id: UUID) -> list[Contract]:
    statement = (
        select(Contract)
        .where(Contract.organization_id == organization_id)
        .order_by(Contract.code.asc())
    )
    return list(db.scalars(statement))


def create_contract(db: Session, payload: ContractCreate) -> Contract:
    project = db.scalar(
        select(Project).where(
            Project.id == payload.project_id,
            Project.organization_id == payload.organization_id,
        )
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    existing = db.scalar(
        select(Contract).where(
            Contract.project_id == payload.project_id,
            Contract.code == payload.code,
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Contract code already exists")

    contract = Contract(
        organization_id=payload.organization_id,
        project_id=payload.project_id,
        code=payload.code,
        title=payload.title,
        currency_code=payload.currency_code.upper(),
        retention_percent=payload.retention_percent,
        retention_cap_percent=payload.retention_cap_percent,
        tax_percent=payload.tax_percent,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=ContractStatus.draft,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract


def list_boq_revisions(db: Session, organization_id: UUID) -> list[BoqRevision]:
    statement = (
        select(BoqRevision)
        .where(BoqRevision.organization_id == organization_id)
        .options(selectinload(BoqRevision.items))
        .order_by(BoqRevision.revision_number.desc())
    )
    return list(db.scalars(statement))


def create_boq_revision(db: Session, payload: BoqRevisionCreate) -> BoqRevision:
    contract = db.scalar(
        select(Contract).where(
            Contract.id == payload.contract_id,
            Contract.project_id == payload.project_id,
            Contract.organization_id == payload.organization_id,
        )
    )
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    existing = db.scalar(
        select(BoqRevision).where(
            BoqRevision.contract_id == payload.contract_id,
            BoqRevision.revision_number == payload.revision_number,
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Revision number already exists")

    revision = BoqRevision(
        organization_id=payload.organization_id,
        project_id=payload.project_id,
        contract_id=payload.contract_id,
        revision_number=payload.revision_number,
        status=BoqRevisionStatus.draft,
    )
    db.add(revision)
    db.flush()

    for item in payload.items:
        amount = Decimal(item.contract_quantity) * Decimal(item.rate)
        db.add(
            BoqItem(
                organization_id=payload.organization_id,
                project_id=payload.project_id,
                contract_id=payload.contract_id,
                boq_revision_id=revision.id,
                item_code=item.item_code,
                trade_code=item.trade_code,
                description=item.description,
                unit=item.unit,
                contract_quantity=item.contract_quantity,
                rate=item.rate,
                amount=amount,
                order_index=item.order_index,
            )
        )

    db.commit()
    return db.scalar(
        select(BoqRevision)
        .where(BoqRevision.id == revision.id)
        .options(selectinload(BoqRevision.items))
    )


def _claim_batch_query():
    return select(ClaimBatch).options(selectinload(ClaimBatch.lines).selectinload(ClaimLine.boq_item))


def _serialize_claim_batch(claim_batch: ClaimBatch) -> ClaimBatchRead:
    total_claimed_amount = Decimal("0")
    lines: list[ClaimLineRead] = []

    for line in claim_batch.lines:
        if line.boq_item is None:
            continue

        line_value = (
            Decimal(line.claimed_quantity_this_period) * Decimal(line.boq_item.rate)
        ) + Decimal(line.claimed_materials_on_site_value or 0)
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
        status=claim_batch.status.value,
        submitted_by_user_id=claim_batch.submitted_by_user_id,
        submitted_at=claim_batch.submitted_at,
        reviewed_by_user_id=claim_batch.reviewed_by_user_id,
        reviewed_at=claim_batch.reviewed_at,
        remarks=claim_batch.remarks,
        created_at=claim_batch.created_at,
        updated_at=claim_batch.updated_at,
        total_claimed_amount=total_claimed_amount,
        lines=lines,
    )


def list_claim_batches(db: Session, organization_id: UUID) -> list[ClaimBatchRead]:
    statement = (
        _claim_batch_query()
        .where(ClaimBatch.organization_id == organization_id)
        .order_by(ClaimBatch.period_number.desc())
    )
    batches = list(db.scalars(statement))
    return [_serialize_claim_batch(batch) for batch in batches]


def create_claim_batch(db: Session, payload: ClaimBatchCreate, current_user_id: UUID) -> ClaimBatchRead:
    contract = db.scalar(
        select(Contract).where(
            Contract.id == payload.contract_id,
            Contract.project_id == payload.project_id,
            Contract.organization_id == payload.organization_id,
        )
    )
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    existing = db.scalar(
        select(ClaimBatch).where(
            ClaimBatch.contract_id == payload.contract_id,
            ClaimBatch.period_number == payload.period_number,
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Claim period already exists")

    boq_item_ids = [line.boq_item_id for line in payload.lines]
    boq_items = (
        db.scalars(
            select(BoqItem).where(
                BoqItem.organization_id == payload.organization_id,
                BoqItem.project_id == payload.project_id,
                BoqItem.contract_id == payload.contract_id,
                BoqItem.id.in_(boq_item_ids),
            )
        ).all()
        if boq_item_ids
        else []
    )
    boq_items_by_id = {item.id: item for item in boq_items}

    if len(boq_items_by_id) != len(set(boq_item_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Claim contains invalid BOQ items")

    claim_batch = ClaimBatch(
        organization_id=payload.organization_id,
        project_id=payload.project_id,
        contract_id=payload.contract_id,
        period_number=payload.period_number,
        status=ClaimStatus.draft,
        remarks=payload.remarks,
    )
    db.add(claim_batch)
    db.flush()

    for line in payload.lines:
        db.add(
            ClaimLine(
                claim_batch_id=claim_batch.id,
                boq_item_id=line.boq_item_id,
                previous_certified_quantity=line.previous_certified_quantity,
                claimed_quantity_this_period=line.claimed_quantity_this_period,
                claimed_materials_on_site_value=line.claimed_materials_on_site_value,
                notes=line.notes,
            )
        )

    db.commit()

    claim = db.scalar(_claim_batch_query().where(ClaimBatch.id == claim_batch.id))
    return _serialize_claim_batch(claim)


def update_claim_batch_status(
    db: Session,
    organization_id: UUID,
    claim_batch_id: UUID,
    payload: ClaimBatchStatusUpdate,
    current_user_id: UUID,
) -> ClaimBatchRead:
    claim_batch = db.scalar(
        _claim_batch_query().where(
            ClaimBatch.id == claim_batch_id,
            ClaimBatch.organization_id == organization_id,
        )
    )
    if claim_batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    try:
        next_status = ClaimStatus(payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid claim status") from exc

    claim_batch.status = next_status
    if payload.remarks is not None:
        claim_batch.remarks = payload.remarks

    now = datetime.now(timezone.utc)
    if next_status == ClaimStatus.submitted:
        claim_batch.submitted_at = now
        claim_batch.submitted_by_user_id = current_user_id
    elif next_status in {
        ClaimStatus.under_review,
        ClaimStatus.approved,
        ClaimStatus.rejected,
        ClaimStatus.certified,
        ClaimStatus.paid,
    }:
        claim_batch.reviewed_at = now
        claim_batch.reviewed_by_user_id = current_user_id
        if claim_batch.submitted_at is None:
            claim_batch.submitted_at = now
            claim_batch.submitted_by_user_id = current_user_id

    db.commit()
    db.refresh(claim_batch)
    return _serialize_claim_batch(claim_batch)
