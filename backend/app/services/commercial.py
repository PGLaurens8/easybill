from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.commercial import (
    BoqItem,
    BoqRevision,
    BoqRevisionStatus,
    ClaimStatus,
    Contract,
    ContractStatus,
    Membership,
    MembershipRole,
    Organization,
    Project,
    ProjectStatus,
)
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
