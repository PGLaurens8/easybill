"""Create the demo login and a realistic demo workspace.

Run from backend/ with DATABASE_URL, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set:

    python -m scripts.seed_demo --email demo@quanteasy.app --password '<password>' --owner-email you@company.com

--owner-email (optional) makes an existing user Admin of the demo workspace so they can manage it.
--reset deletes and recreates the demo workspace (e.g. after visitors have changed it).
--demo-user-id skips Supabase and uses an existing user id (local testing).

The demo login is a Commercial Manager, not an Admin, so visitors cannot invite people by email.
"""

import argparse
import sys
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.commercial import (
    AuditEvent,
    BoqItem,
    BoqRevision,
    CertificateBatch,
    CertificateLine,
    ClaimBatch,
    ClaimLine,
    ContraCharge,
    Contract,
    Membership,
    MembershipRole,
    Organization,
    OrganizationInvitation,
    Project,
    VariationOrder,
)
from app.schemas.auth import OrgAccess
from app.schemas.boq_revision import BoqItemCreate, BoqRevisionCreate
from app.schemas.certificate import CertificateBatchCreate, CertificateLineAdjustment, CertificateStatusUpdate
from app.schemas.claim import ClaimBatchCreate, ClaimBatchStatusUpdate, ClaimLineCreate
from app.schemas.contract import ContractCreate
from app.schemas.project import ProjectCreate
from app.schemas.variation import ContraChargeCreate, VariationItem, VariationOrderCreate
from app.services.boq import create_boq_revision, get_latest_boq_revision
from app.services.certificates import create_certificate_batch, update_certificate_status
from app.services.claims import create_claim_batch, update_claim_batch_status
from app.services.projects import create_contract, create_project
from app.services.variations import create_contra_charge, create_variation

DEMO_SLUG = "quanteasy-demo"

# (code, title, subcontractor, [(item, description, unit, qty, rate)])
CONTRACTS = [
    (
        "SC-001",
        "Brickwork & plaster",
        "Mthembu Builders (Pty) Ltd",
        [
            ("B1", "Face brick external walls", "m2", "1200", "420"),
            ("B2", "Common brick internal walls", "m2", "900", "310"),
            ("B3", "Brickforce every 4th course", "m", "2400", "18.50"),
            ("P1", "Internal plaster, steel-float finish", "m2", "3200", "85.50"),
            ("P2", "External plaster and bagging", "m2", "1400", "98"),
        ],
    ),
    (
        "SC-002",
        "Roof sheeting & waterproofing",
        "Top Roof CC",
        [
            ("R1", "IBR 0.53mm roof sheeting", "m2", "1800", "265"),
            ("R2", "Ridge capping", "m", "240", "145"),
            ("R3", "Fibre-cement fascia boards", "m", "420", "120"),
            ("R4", "Torch-on waterproofing to parapets", "m2", "350", "210"),
        ],
    ),
    (
        "SC-003",
        "Electrical installation",
        "Volt Electrical Contractors",
        [
            ("E1", "Distribution board per unit", "no", "24", "6500"),
            ("E2", "First and second fix wiring per unit", "no", "24", "18500"),
            ("E3", "Light points", "no", "480", "420"),
            ("E4", "Double plug points", "no", "360", "380"),
        ],
    ),
    (
        "SC-004",
        "Plumbing & drainage",
        "AquaFlow Plumbing",
        [
            ("PL1", "Hot and cold water reticulation per unit", "no", "24", "14200"),
            ("PL2", "110mm uPVC drainage", "m", "650", "240"),
            ("PL3", "Sanitary fittings installed per unit", "no", "24", "9800"),
        ],
    ),
    ("SC-005", "Painting", "Colour Pro Painters", []),
]


def delete_demo_workspace(db: Session, organization_id: UUID) -> None:
    """Delete everything in the demo organization, children before parents (Postgres enforces the FKs)."""
    certificate_ids = select(CertificateBatch.id).where(CertificateBatch.organization_id == organization_id)
    claim_ids = select(ClaimBatch.id).where(ClaimBatch.organization_id == organization_id)
    db.execute(delete(ContraCharge).where(ContraCharge.organization_id == organization_id))
    db.execute(delete(CertificateLine).where(CertificateLine.certificate_batch_id.in_(certificate_ids)))
    db.execute(delete(CertificateBatch).where(CertificateBatch.organization_id == organization_id))
    db.execute(delete(ClaimLine).where(ClaimLine.claim_batch_id.in_(claim_ids)))
    for model in (
        ClaimBatch,
        BoqItem,
        VariationOrder,
        BoqRevision,
        Contract,
        Project,
        AuditEvent,
        OrganizationInvitation,
        Membership,
    ):
        db.execute(delete(model).where(model.organization_id == organization_id))
    db.execute(delete(Organization).where(Organization.id == organization_id))
    db.commit()


def seed(db: Session, demo_user_id: UUID, demo_email: str, owner: tuple[UUID, str] | None) -> Organization:
    organization = Organization(name="QuantEasy Demo Builders", slug=DEMO_SLUG)
    db.add(organization)
    db.flush()
    db.add(
        Membership(
            organization_id=organization.id,
            user_id=demo_user_id,
            email=demo_email,
            role=MembershipRole.commercial_manager,
        )
    )
    if owner and owner[0] != demo_user_id:
        db.add(
            Membership(organization_id=organization.id, user_id=owner[0], email=owner[1], role=MembershipRole.org_admin)
        )
    db.commit()

    org_id = organization.id
    project = create_project(
        db,
        ProjectCreate(
            organization_id=org_id,
            code="DEMO-01",
            name="Riverside Residential – Phase 1",
            client_name="Riverside Property Developers",
            description="24 double-storey units with shared services. Demo data – feel free to click around.",
            retention_percent_default=Decimal("10"),
            tax_percent_default=Decimal("15"),
        ),
    )

    contracts: dict[str, Contract] = {}
    items: dict[str, dict[str, UUID]] = {}
    for code, title, subcontractor, boq in CONTRACTS:
        contract = create_contract(
            db,
            ContractCreate(
                organization_id=org_id,
                project_id=project.id,
                code=code,
                title=title,
                subcontractor_name=subcontractor,
                retention_percent=Decimal("10"),
                retention_cap_percent=Decimal("5"),
                tax_percent=Decimal("15"),
            ),
        )
        contracts[code] = contract
        if boq:
            revision = create_boq_revision(
                db,
                BoqRevisionCreate(
                    organization_id=org_id,
                    project_id=project.id,
                    contract_id=contract.id,
                    items=[
                        BoqItemCreate(
                            item_code=item,
                            trade_code=code,
                            description=description,
                            unit=unit,
                            contract_quantity=Decimal(qty),
                            rate=Decimal(rate),
                            order_index=index,
                        )
                        for index, (item, description, unit, qty, rate) in enumerate(boq)
                    ],
                ),
            )
            items[code] = {item.item_code: item.id for item in revision.items}

    def claim(code: str, lines: dict[str, str], remarks: str | None = None, mos: dict[str, str] | None = None):
        mos = mos or {}
        return create_claim_batch(
            db,
            ClaimBatchCreate(
                organization_id=org_id,
                project_id=project.id,
                contract_id=contracts[code].id,
                remarks=remarks,
                lines=[
                    ClaimLineCreate(
                        boq_item_id=items[code][item],
                        claimed_quantity_this_period=Decimal(lines.get(item, "0")),
                        claimed_materials_on_site_value=Decimal(mos[item]) if item in mos else None,
                    )
                    for item in {**lines, **mos}
                ],
            ),
            demo_user_id,
        )

    def move(claim_id: UUID, *statuses: str, remarks: str | None = None):
        for index, next_status in enumerate(statuses):
            last = index == len(statuses) - 1
            update_claim_batch_status(
                db,
                org_id,
                claim_id,
                ClaimBatchStatusUpdate(status=next_status, remarks=remarks if last else None),
                demo_user_id,
            )

    def certify(code: str, claim_id: UUID, days_ago: int, adjustments: dict[str, str] | None = None):
        return create_certificate_batch(
            db,
            CertificateBatchCreate(
                organization_id=org_id,
                project_id=project.id,
                contract_id=contracts[code].id,
                claim_batch_id=claim_id,
                issue_date=date.today() - timedelta(days=days_ago),
                adjustments=[
                    CertificateLineAdjustment(
                        boq_item_id=items[code][item],
                        certified_quantity_this_period=Decimal(qty),
                        notes="Measured on site by QS",
                    )
                    for item, qty in (adjustments or {}).items()
                ],
            ),
            demo_user_id,
        )

    demo_access = OrgAccess(organization_id=org_id, user_id=demo_user_id, role=MembershipRole.commercial_manager)

    # Brickwork: an approved variation, a deduction, two certificates (first paid, second adjusted by the QS),
    # and period 3 awaiting approval.
    create_variation(
        db,
        VariationOrderCreate(
            organization_id=org_id,
            contract_id=contracts["SC-001"].id,
            title="Extra boundary wall to Block A",
            description="Instructed on site by the architect (SI 04).",
            items=[
                VariationItem(
                    item_code="VO-001.1",
                    description="Face brick boundary wall",
                    unit="m2",
                    quantity=Decimal("60"),
                    rate=Decimal("450"),
                )
            ],
            approve_now=True,
        ),
        demo_access,
    )
    # Approving the variation published a new BOQ revision; claims must use its item ids.
    latest = get_latest_boq_revision(db, org_id, contracts["SC-001"].id)
    items["SC-001"] = {item.item_code: item.id for item in latest.items}
    create_contra_charge(
        db,
        ContraChargeCreate(
            organization_id=org_id,
            contract_id=contracts["SC-001"].id,
            description="Removal of rubble left at Block A",
            amount=Decimal("3500"),
            charge_date=date.today() - timedelta(days=60),
        ),
        demo_access,
    )
    first = claim("SC-001", {"B1": "450", "B2": "300", "B3": "900"}, "Block A and B external skins to wall plate")
    move(first.id, "Submitted", "Approved")
    cert_1 = certify("SC-001", first.id, days_ago=58)
    update_certificate_status(db, org_id, cert_1.id, CertificateStatusUpdate(status="Paid"), demo_user_id)

    second = claim(
        "SC-001",
        {"B1": "350", "B2": "250", "P1": "800"},
        "Blocks C and D brickwork, internal plaster started",
        mos={"P2": "12000"},
    )
    move(second.id, "Submitted", "Approved")
    certify("SC-001", second.id, days_ago=27, adjustments={"B1": "320"})

    third = claim(
        "SC-001",
        {"B1": "200", "P1": "900", "P2": "300", "VO-001.1": "60"},
        "Block E complete, external plaster to A and B, boundary wall done",
    )
    move(third.id, "Submitted")

    # Roofing: approved and ready for the QS to certify.
    roof = claim("SC-002", {"R1": "600", "R3": "120"}, "Blocks A–C roofed")
    move(roof.id, "Submitted", "Approved")

    create_variation(
        db,
        VariationOrderCreate(
            organization_id=org_id,
            contract_id=contracts["SC-002"].id,
            title="Additional flashing to parapets",
            items=[
                VariationItem(
                    item_code="VO-001.1",
                    description="Galvanised flashing",
                    unit="m",
                    quantity=Decimal("85"),
                    rate=Decimal("165"),
                )
            ],
        ),
        demo_access,
    )

    # Electrical: rejected with a reason for the subcontractor.
    electrical = claim("SC-003", {"E2": "8", "E3": "120"}, "First fix to 8 units")
    move(
        electrical.id,
        "Submitted",
        "Rejected",
        remarks="Only 6 units' first-fix wiring has been inspected. Resubmit for 6 with the inspection sheets.",
    )

    return organization


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", required=True, help="Demo login email")
    parser.add_argument("--password", help="Demo login password (required unless --demo-user-id is given)")
    parser.add_argument("--owner-email", help="Existing user to make Admin of the demo workspace")
    parser.add_argument("--demo-user-id", type=UUID, help="Use this user id instead of creating a Supabase user")
    parser.add_argument("--owner-user-id", type=UUID, help="Owner user id (skips Supabase lookup)")
    parser.add_argument("--reset", action="store_true", help="Delete and recreate the demo workspace")
    args = parser.parse_args()

    if args.demo_user_id:
        demo_user_id = args.demo_user_id
    else:
        if not args.password:
            parser.error("--password is required to create the demo login")
        from app.services.identity import ensure_password_user

        demo_user_id = ensure_password_user(args.email, args.password)
        print(f"Demo login ready: {args.email} ({demo_user_id})")

    owner: tuple[UUID, str] | None = None
    if args.owner_user_id:
        owner = (args.owner_user_id, args.owner_email or "")
    elif args.owner_email:
        from app.services.identity import find_user_id_by_email

        owner_id = find_user_id_by_email(args.owner_email)
        if owner_id is None:
            print(f"Warning: no account for {args.owner_email}; the demo workspace will have no Admin.")
        else:
            owner = (owner_id, args.owner_email.lower())

    with SessionLocal() as db:
        existing = db.scalar(select(Organization).where(Organization.slug == DEMO_SLUG))
        if existing and not args.reset:
            print(f"Demo workspace already exists ({existing.id}). Use --reset to recreate it.")
            return 0
        if existing:
            delete_demo_workspace(db, existing.id)
            print("Deleted the previous demo workspace.")

        organization = seed(db, demo_user_id, args.email.lower(), owner)
        print(f"Seeded demo workspace '{organization.name}' ({organization.id}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
