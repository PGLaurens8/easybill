from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.commercial import Contract, ContractStatus, Membership, Project, ProjectStatus
from app.schemas.contract import ContractCreate, ContractUpdate
from app.schemas.project import ProjectCreate
from app.services.access import get_contract, visible_contract_ids


def list_projects(db: Session, organization_id: UUID, contractor_user_id: UUID | None = None) -> list[Project]:
    statement = select(Project).where(Project.organization_id == organization_id)
    if contractor_user_id is not None:
        assigned_projects = select(Contract.project_id).where(
            Contract.id.in_(visible_contract_ids(organization_id, contractor_user_id))
        )
        statement = statement.where(Project.id.in_(assigned_projects))
    return list(db.scalars(statement.order_by(Project.code.asc())))


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


def list_contracts(db: Session, organization_id: UUID, contractor_user_id: UUID | None = None) -> list[Contract]:
    statement = select(Contract).where(Contract.organization_id == organization_id)
    if contractor_user_id is not None:
        statement = statement.where(Contract.subcontractor_user_id == contractor_user_id)
    return list(db.scalars(statement.order_by(Contract.code.asc())))


def _ensure_member(db: Session, organization_id: UUID, user_id: UUID | None) -> None:
    if user_id is None:
        return
    member = db.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == user_id,
        )
    )
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The subcontractor login must be a member of this organization",
        )


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

    _ensure_member(db, payload.organization_id, payload.subcontractor_user_id)

    contract = Contract(
        organization_id=payload.organization_id,
        project_id=payload.project_id,
        code=payload.code,
        title=payload.title,
        subcontractor_name=(payload.subcontractor_name or "").strip() or None,
        subcontractor_user_id=payload.subcontractor_user_id,
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


def update_contract(db: Session, organization_id: UUID, contract_id: UUID, payload: ContractUpdate) -> Contract:
    contract = get_contract(db, organization_id, contract_id)
    changes = payload.model_dump(exclude_unset=True)

    if "subcontractor_user_id" in changes:
        _ensure_member(db, organization_id, changes["subcontractor_user_id"])

    if "status" in changes:
        try:
            changes["status"] = ContractStatus(changes["status"])
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid contract status") from exc

    if "subcontractor_name" in changes:
        changes["subcontractor_name"] = (changes["subcontractor_name"] or "").strip() or None

    for field, value in changes.items():
        setattr(contract, field, value)

    db.commit()
    db.refresh(contract)
    return contract
