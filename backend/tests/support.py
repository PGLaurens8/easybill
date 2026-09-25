"""Shared sqlite-backed fixtures for service and route tests."""

import os
from dataclasses import dataclass, field
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.commercial import (
    BoqItem,
    BoqRevision,
    BoqRevisionStatus,
    Contract,
    ContractStatus,
    Membership,
    MembershipRole,
    Organization,
    Project,
    ProjectStatus,
)


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(_type, _compiler, **_kw):
    return "JSON"


@compiles(PG_UUID, "sqlite")
def _compile_uuid_sqlite(_type, _compiler, **_kw):
    return "TEXT"


def make_session_factory():
    """In-memory sqlite by default; set TEST_DATABASE_URL to run the same tests against Postgres."""
    database_url = os.environ.get("TEST_DATABASE_URL")
    if database_url:
        engine = create_engine(database_url)
        Base.metadata.drop_all(engine)
    else:
        engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    Base.metadata.create_all(engine)
    return engine, sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


@dataclass
class Workspace:
    organization_id: UUID
    project_id: UUID
    admin_user_id: UUID
    contracts: dict[str, UUID] = field(default_factory=dict)
    items: dict[str, dict[str, UUID]] = field(default_factory=dict)


def seed_workspace(db: Session) -> Workspace:
    ws = Workspace(organization_id=uuid4(), project_id=uuid4(), admin_user_id=uuid4())
    db.add(Organization(id=ws.organization_id, name="Acme Builders", slug=f"acme-{ws.organization_id.hex[:8]}"))
    db.add(Membership(organization_id=ws.organization_id, user_id=ws.admin_user_id, role=MembershipRole.org_admin))
    db.add(
        Project(
            id=ws.project_id,
            organization_id=ws.organization_id,
            code="PRJ-001",
            name="Willows Estate",
            status=ProjectStatus.ongoing,
            currency_code="ZAR",
        )
    )
    db.commit()
    return ws


def add_member(db: Session, ws: Workspace, role: MembershipRole, user_id: UUID | None = None) -> UUID:
    user_id = user_id or uuid4()
    db.add(Membership(organization_id=ws.organization_id, user_id=user_id, role=role))
    db.commit()
    return user_id


def add_contract(
    db: Session,
    ws: Workspace,
    code: str,
    items: list[tuple[str, str, str]],
    *,
    subcontractor_user_id: UUID | None = None,
    retention_percent: str = "10.00",
    retention_cap_percent: str | None = None,
    tax_percent: str = "15.00",
    revision_number: int = 1,
) -> UUID:
    """items: (item_code, contract_quantity, rate)."""
    contract_id = uuid4()
    db.add(
        Contract(
            id=contract_id,
            organization_id=ws.organization_id,
            project_id=ws.project_id,
            code=code,
            title=f"{code} package",
            subcontractor_user_id=subcontractor_user_id,
            status=ContractStatus.active,
            currency_code="ZAR",
            retention_percent=Decimal(retention_percent),
            retention_cap_percent=Decimal(retention_cap_percent) if retention_cap_percent else None,
            tax_percent=Decimal(tax_percent),
        )
    )
    db.commit()
    ws.contracts[code] = contract_id
    add_revision(db, ws, code, items, revision_number=revision_number)
    return contract_id


def add_revision(db: Session, ws: Workspace, contract_code: str, items, *, revision_number: int) -> dict[str, UUID]:
    contract_id = ws.contracts[contract_code]
    revision_id = uuid4()
    db.add(
        BoqRevision(
            id=revision_id,
            organization_id=ws.organization_id,
            project_id=ws.project_id,
            contract_id=contract_id,
            revision_number=revision_number,
            status=BoqRevisionStatus.published,
        )
    )
    ids: dict[str, UUID] = {}
    for index, (item_code, qty, rate) in enumerate(items):
        item_id = uuid4()
        ids[item_code] = item_id
        db.add(
            BoqItem(
                id=item_id,
                organization_id=ws.organization_id,
                project_id=ws.project_id,
                contract_id=contract_id,
                boq_revision_id=revision_id,
                item_code=item_code,
                description=f"Work item {item_code}",
                unit="m2",
                contract_quantity=Decimal(qty),
                rate=Decimal(rate),
                amount=(Decimal(qty) * Decimal(rate)).quantize(Decimal("0.01")),
                order_index=index,
            )
        )
    db.commit()
    ws.items[contract_code] = ids
    return ids
