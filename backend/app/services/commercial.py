from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.commercial import (
    AuditEvent,
    BoqItem,
    BoqRevision,
    BoqRevisionStatus,
    CertificateBatch,
    CertificateLine,
    CertificateStatus,
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
from app.schemas.boq_revision import BoqRevisionCreate
from app.schemas.certificate import CertificateBatchCreate, CertificateBatchRead, CertificateLineRead
from app.schemas.claim import ClaimBatchCreate, ClaimBatchRead, ClaimBatchStatusUpdate, ClaimLineRead
from app.schemas.contract import ContractCreate
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationMembershipCreate,
    OrganizationMembershipUpdate,
)
from app.schemas.project import ProjectCreate

ALLOWED_CLAIM_STATUS_TRANSITIONS: dict[ClaimStatus, set[ClaimStatus]] = {
    ClaimStatus.draft: {ClaimStatus.submitted},
    ClaimStatus.submitted: {ClaimStatus.under_review, ClaimStatus.rejected},
    ClaimStatus.under_review: {ClaimStatus.approved, ClaimStatus.rejected},
    ClaimStatus.approved: {ClaimStatus.certified},
    ClaimStatus.rejected: {ClaimStatus.draft},
    ClaimStatus.certified: {ClaimStatus.paid},
    ClaimStatus.paid: set(),
}

CLAIM_TRANSITION_ALLOWED_ROLES: dict[tuple[ClaimStatus, ClaimStatus], set[MembershipRole]] = {
    (ClaimStatus.draft, ClaimStatus.submitted): {
        MembershipRole.org_admin,
        MembershipRole.commercial_manager,
        MembershipRole.quantity_surveyor,
    },
    (ClaimStatus.submitted, ClaimStatus.under_review): {
        MembershipRole.org_admin,
        MembershipRole.commercial_manager,
        MembershipRole.accounts,
    },
    (ClaimStatus.submitted, ClaimStatus.rejected): {
        MembershipRole.org_admin,
        MembershipRole.commercial_manager,
        MembershipRole.accounts,
    },
    (ClaimStatus.under_review, ClaimStatus.approved): {
        MembershipRole.org_admin,
        MembershipRole.commercial_manager,
        MembershipRole.accounts,
    },
    (ClaimStatus.under_review, ClaimStatus.rejected): {
        MembershipRole.org_admin,
        MembershipRole.commercial_manager,
        MembershipRole.accounts,
    },
    (ClaimStatus.rejected, ClaimStatus.draft): {
        MembershipRole.org_admin,
        MembershipRole.commercial_manager,
        MembershipRole.quantity_surveyor,
    },
    (ClaimStatus.approved, ClaimStatus.certified): {
        MembershipRole.org_admin,
        MembershipRole.accounts,
    },
    (ClaimStatus.certified, ClaimStatus.paid): {
        MembershipRole.org_admin,
        MembershipRole.accounts,
    },
}

CERTIFIABLE_CLAIM_STATUSES = {
    ClaimStatus.approved,
    ClaimStatus.certified,
    ClaimStatus.paid,
}


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


def list_organization_memberships(db: Session, organization_id: UUID) -> list[Membership]:
    statement = (
        select(Membership)
        .where(Membership.organization_id == organization_id)
        .order_by(Membership.created_at.asc(), Membership.user_id.asc())
    )
    return list(db.scalars(statement))


def add_organization_membership(
    db: Session,
    organization_id: UUID,
    payload: OrganizationMembershipCreate,
    current_user_id: UUID,
) -> Membership:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    existing_membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == payload.user_id,
        )
    )
    if existing_membership:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member of this organization")

    membership = Membership(
        organization_id=organization_id,
        user_id=payload.user_id,
        role=payload.role,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def update_organization_membership_role(
    db: Session,
    organization_id: UUID,
    membership_id: UUID,
    payload: OrganizationMembershipUpdate,
    current_user_id: UUID,
) -> Membership:
    membership = db.scalar(
        select(Membership).where(
            Membership.id == membership_id,
            Membership.organization_id == organization_id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")

    if membership.user_id == current_user_id and payload.role != MembershipRole.org_admin:
        admin_count = db.scalar(
            select(func.count())
            .select_from(Membership)
            .where(
                Membership.organization_id == organization_id,
                Membership.role == MembershipRole.org_admin,
            )
        )
        if admin_count == 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="At least one organization admin is required",
            )

    membership.role = payload.role
    db.commit()
    db.refresh(membership)
    return membership


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


def _certificate_batch_query():
    return select(CertificateBatch).options(selectinload(CertificateBatch.lines))


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


def _serialize_certificate_batch(certificate_batch: CertificateBatch) -> CertificateBatchRead:
    lines = [CertificateLineRead.model_validate(line) for line in certificate_batch.lines]
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
        net_certified_to_date_excl_tax=certificate_batch.net_certified_to_date_excl_tax,
        amount_due_this_certificate_excl_tax=certificate_batch.amount_due_this_certificate_excl_tax,
        tax_this_certificate=certificate_batch.tax_this_certificate,
        amount_due_this_certificate_incl_tax=certificate_batch.amount_due_this_certificate_incl_tax,
        issued_by_user_id=certificate_batch.issued_by_user_id,
        created_at=certificate_batch.created_at,
        updated_at=certificate_batch.updated_at,
        lines=lines,
    )


def _get_latest_boq_revision(db: Session, organization_id: UUID, project_id: UUID, contract_id: UUID) -> BoqRevision | None:
    return db.scalar(
        select(BoqRevision)
        .where(
            BoqRevision.organization_id == organization_id,
            BoqRevision.project_id == project_id,
            BoqRevision.contract_id == contract_id,
        )
        .options(selectinload(BoqRevision.items))
        .order_by(BoqRevision.revision_number.desc())
    )


def _get_membership_role(db: Session, organization_id: UUID, user_id: UUID) -> MembershipRole:
    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == user_id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No organization access")
    return membership.role


def _get_previous_certificate_batch(
    db: Session,
    organization_id: UUID,
    contract_id: UUID,
    issue_date: date,
) -> CertificateBatch | None:
    return db.scalar(
        select(CertificateBatch)
        .where(
            CertificateBatch.organization_id == organization_id,
            CertificateBatch.contract_id == contract_id,
            CertificateBatch.status != CertificateStatus.voided,
            CertificateBatch.issue_date < issue_date,
        )
        .order_by(CertificateBatch.issue_date.desc(), CertificateBatch.created_at.desc())
    )


def _get_certified_quantities_by_boq_item(
    db: Session,
    organization_id: UUID,
    contract_id: UUID,
) -> dict[UUID, Decimal]:
    statement = (
        select(CertificateBatch)
        .where(
            CertificateBatch.organization_id == organization_id,
            CertificateBatch.contract_id == contract_id,
            CertificateBatch.status != CertificateStatus.voided,
        )
        .options(selectinload(CertificateBatch.lines))
        .order_by(CertificateBatch.issue_date.asc(), CertificateBatch.created_at.asc())
    )

    certified_quantities: dict[UUID, Decimal] = {}
    for certificate_batch in db.scalars(statement):
        for line in certificate_batch.lines:
            certified_quantity = Decimal(line.certified_quantity_this_period or 0)
            certified_quantities[line.boq_item_id] = certified_quantities.get(
                line.boq_item_id, Decimal("0")
            ) + certified_quantity

    return certified_quantities


def build_claim_created_audit_metadata(
    *,
    period_number: int,
    project_id: UUID,
    contract_id: UUID,
    revision_number: int,
    line_count: int,
) -> dict[str, str | int]:
    return {
        "period_number": period_number,
        "project_id": str(project_id),
        "contract_id": str(contract_id),
        "source_revision_number": revision_number,
        "line_count": line_count,
    }


def build_claim_status_audit_metadata(
    *,
    previous_status: ClaimStatus,
    next_status: ClaimStatus,
    actor_role: MembershipRole,
    remarks_present: bool,
) -> dict[str, str | bool]:
    return {
        "previous_status": previous_status.value,
        "next_status": next_status.value,
        "actor_role": actor_role.value,
        "remarks_present": remarks_present,
    }


def build_certificate_created_audit_metadata(
    *,
    certificate_number: str,
    claim_batch_id: UUID,
    gross_value_to_date: Decimal,
    amount_due_this_certificate_excl_tax: Decimal,
) -> dict[str, str]:
    return {
        "certificate_number": certificate_number,
        "claim_batch_id": str(claim_batch_id),
        "gross_value_to_date": str(gross_value_to_date),
        "amount_due_this_certificate_excl_tax": str(amount_due_this_certificate_excl_tax),
    }


def _record_audit_event(
    db: Session,
    *,
    organization_id: UUID,
    entity_type: str,
    entity_id: UUID,
    actor_user_id: UUID | None,
    action: str,
    metadata: dict[str, str | int | bool],
) -> None:
    db.add(
        AuditEvent(
            organization_id=organization_id,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_user_id=actor_user_id,
            action=action,
            occurred_at=datetime.now(timezone.utc),
            audit_metadata=metadata,
        )
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

    allowed_values = ", ".join(sorted(status.value for status in allowed_statuses)) or "none"
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
    allowed_roles = CLAIM_TRANSITION_ALLOWED_ROLES.get((current_status, next_status), set())
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

    latest_revision = _get_latest_boq_revision(
        db,
        payload.organization_id,
        payload.project_id,
        payload.contract_id,
    )
    if latest_revision is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Create a BOQ revision before creating a claim",
        )

    existing = db.scalar(
        select(ClaimBatch).where(
            ClaimBatch.contract_id == payload.contract_id,
            ClaimBatch.period_number == payload.period_number,
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Claim period already exists")

    boq_item_ids = [line.boq_item_id for line in payload.lines]
    if len(boq_item_ids) != len(set(boq_item_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claim cannot contain duplicate BOQ items",
        )

    latest_revision_items_by_id = {item.id: item for item in latest_revision.items}
    if len(latest_revision_items_by_id) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latest BOQ revision has no items to claim against",
        )

    certified_quantities_by_boq_item = _get_certified_quantities_by_boq_item(
        db,
        payload.organization_id,
        payload.contract_id,
    )
    derived_previous_certified_quantities: dict[UUID, Decimal] = {}

    for line in payload.lines:
        boq_item = latest_revision_items_by_id.get(line.boq_item_id)
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

        derived_previous_certified_quantity = certified_quantities_by_boq_item.get(
            line.boq_item_id, Decimal("0")
        )
        derived_previous_certified_quantities[line.boq_item_id] = derived_previous_certified_quantity

        cumulative_quantity = derived_previous_certified_quantity + line.claimed_quantity_this_period
        if cumulative_quantity > Decimal(boq_item.contract_quantity):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Claim quantity for BOQ item {boq_item.item_code} exceeds the contract quantity on the latest revision"
                ),
            )

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
                previous_certified_quantity=derived_previous_certified_quantities.get(
                    line.boq_item_id, Decimal("0")
                ),
                claimed_quantity_this_period=line.claimed_quantity_this_period,
                claimed_materials_on_site_value=line.claimed_materials_on_site_value,
                notes=line.notes,
            )
        )

    _record_audit_event(
        db,
        organization_id=payload.organization_id,
        entity_type="ClaimBatch",
        entity_id=claim_batch.id,
        actor_user_id=current_user_id,
        action="claim_batch.created",
        metadata=build_claim_created_audit_metadata(
            period_number=payload.period_number,
            project_id=payload.project_id,
            contract_id=payload.contract_id,
            revision_number=latest_revision.revision_number,
            line_count=len(payload.lines),
        ),
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

    actor_role = _get_membership_role(db, organization_id, current_user_id)
    ensure_allowed_claim_status_transition(claim_batch.status, next_status)
    ensure_actor_can_transition_claim(claim_batch.status, next_status, actor_role)

    previous_status = claim_batch.status
    claim_batch.status = next_status
    if payload.remarks is not None:
        claim_batch.remarks = payload.remarks

    now = datetime.now(timezone.utc)
    if next_status == ClaimStatus.submitted:
        claim_batch.submitted_at = now
        claim_batch.submitted_by_user_id = current_user_id
        claim_batch.reviewed_at = None
        claim_batch.reviewed_by_user_id = None
    elif next_status in {ClaimStatus.under_review, ClaimStatus.approved, ClaimStatus.rejected}:
        claim_batch.reviewed_at = now
        claim_batch.reviewed_by_user_id = current_user_id
    elif next_status == ClaimStatus.draft:
        claim_batch.submitted_at = None
        claim_batch.submitted_by_user_id = None
        claim_batch.reviewed_at = None
        claim_batch.reviewed_by_user_id = None
    elif next_status in {ClaimStatus.certified, ClaimStatus.paid}:
        if claim_batch.reviewed_at is None:
            claim_batch.reviewed_at = now
            claim_batch.reviewed_by_user_id = current_user_id

    _record_audit_event(
        db,
        organization_id=organization_id,
        entity_type="ClaimBatch",
        entity_id=claim_batch.id,
        actor_user_id=current_user_id,
        action="claim_batch.status_changed",
        metadata=build_claim_status_audit_metadata(
            previous_status=previous_status,
            next_status=next_status,
            actor_role=actor_role,
            remarks_present=payload.remarks is not None,
        ),
    )

    db.commit()
    db.refresh(claim_batch)
    return _serialize_claim_batch(claim_batch)


def list_certificate_batches(db: Session, organization_id: UUID) -> list[CertificateBatchRead]:
    statement = (
        _certificate_batch_query()
        .where(CertificateBatch.organization_id == organization_id)
        .order_by(CertificateBatch.issue_date.desc(), CertificateBatch.certificate_number.desc())
    )
    batches = list(db.scalars(statement))
    return [_serialize_certificate_batch(batch) for batch in batches]


def create_certificate_batch(db: Session, payload: CertificateBatchCreate, current_user_id: UUID) -> CertificateBatchRead:
    contract = db.scalar(
        select(Contract).where(
            Contract.id == payload.contract_id,
            Contract.project_id == payload.project_id,
            Contract.organization_id == payload.organization_id,
        )
    )
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    claim_batch = db.scalar(
        _claim_batch_query().where(
            ClaimBatch.id == payload.claim_batch_id,
            ClaimBatch.organization_id == payload.organization_id,
            ClaimBatch.project_id == payload.project_id,
            ClaimBatch.contract_id == payload.contract_id,
        )
    )
    if claim_batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    if claim_batch.status not in CERTIFIABLE_CLAIM_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Claim must be approved before a certificate can be created",
        )

    existing = db.scalar(
        select(CertificateBatch).where(
            CertificateBatch.contract_id == payload.contract_id,
            CertificateBatch.certificate_number == payload.certificate_number,
        )
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Certificate number already exists")

    existing_claim_certificate = db.scalar(
        select(CertificateBatch).where(
            CertificateBatch.organization_id == payload.organization_id,
            CertificateBatch.claim_batch_id == payload.claim_batch_id,
        )
    )
    if existing_claim_certificate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Certificate already exists for claim")

    previous_certificate = _get_previous_certificate_batch(
        db,
        payload.organization_id,
        payload.contract_id,
        payload.issue_date,
    )
    previous_net_certified_excl_tax = Decimal(previous_certificate.net_certified_to_date_excl_tax or 0) if previous_certificate else Decimal("0")

    gross_value_to_date = Decimal("0")
    certificate_lines: list[CertificateLine] = []

    for claim_line in claim_batch.lines:
        if claim_line.boq_item is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Claim contains invalid BOQ item state")

        rate = Decimal(claim_line.boq_item.rate)
        certified_quantity = Decimal(claim_line.claimed_quantity_this_period)
        previous_certified_quantity = Decimal(claim_line.previous_certified_quantity)
        materials_on_site_value = Decimal(claim_line.claimed_materials_on_site_value or 0)
        work_value_to_date = (previous_certified_quantity + certified_quantity) * rate
        gross_line_value_to_date = work_value_to_date + materials_on_site_value
        gross_value_to_date += gross_line_value_to_date

        certificate_lines.append(
            CertificateLine(
                boq_item_id=claim_line.boq_item_id,
                claimed_quantity_this_period=claim_line.claimed_quantity_this_period,
                certified_quantity_this_period=claim_line.claimed_quantity_this_period,
                previous_certified_quantity=claim_line.previous_certified_quantity,
                rate=claim_line.boq_item.rate,
                work_value_to_date=work_value_to_date,
                materials_on_site_value_to_date=claim_line.claimed_materials_on_site_value,
                notes=claim_line.notes,
            )
        )

    retention_held_to_date = (gross_value_to_date * Decimal(contract.retention_percent)) / Decimal("100")
    net_certified_to_date_excl_tax = gross_value_to_date - retention_held_to_date
    amount_due_this_certificate_excl_tax = net_certified_to_date_excl_tax - previous_net_certified_excl_tax
    tax_this_certificate = (amount_due_this_certificate_excl_tax * Decimal(contract.tax_percent)) / Decimal("100")
    amount_due_this_certificate_incl_tax = amount_due_this_certificate_excl_tax + tax_this_certificate

    if claim_batch.status == ClaimStatus.approved:
        actor_role = _get_membership_role(db, payload.organization_id, current_user_id)
        claim_batch.status = ClaimStatus.certified
        if claim_batch.reviewed_at is None:
            claim_batch.reviewed_at = datetime.now(timezone.utc)
            claim_batch.reviewed_by_user_id = current_user_id

        _record_audit_event(
            db,
            organization_id=payload.organization_id,
            entity_type="ClaimBatch",
            entity_id=claim_batch.id,
            actor_user_id=current_user_id,
            action="claim_batch.status_changed",
            metadata=build_claim_status_audit_metadata(
                previous_status=ClaimStatus.approved,
                next_status=ClaimStatus.certified,
                actor_role=actor_role,
                remarks_present=False,
            ),
        )

    certificate_batch = CertificateBatch(
        organization_id=payload.organization_id,
        project_id=payload.project_id,
        contract_id=payload.contract_id,
        claim_batch_id=payload.claim_batch_id,
        certificate_number=payload.certificate_number,
        status=CertificateStatus.issued,
        issue_date=payload.issue_date,
        previous_net_certified_excl_tax=previous_net_certified_excl_tax,
        gross_value_to_date=gross_value_to_date,
        retention_held_to_date=retention_held_to_date,
        net_certified_to_date_excl_tax=net_certified_to_date_excl_tax,
        amount_due_this_certificate_excl_tax=amount_due_this_certificate_excl_tax,
        tax_this_certificate=tax_this_certificate,
        amount_due_this_certificate_incl_tax=amount_due_this_certificate_incl_tax,
        issued_by_user_id=current_user_id,
    )
    db.add(certificate_batch)
    db.flush()

    for certificate_line in certificate_lines:
        certificate_line.certificate_batch_id = certificate_batch.id
        db.add(certificate_line)

    _record_audit_event(
        db,
        organization_id=payload.organization_id,
        entity_type="CertificateBatch",
        entity_id=certificate_batch.id,
        actor_user_id=current_user_id,
        action="certificate_batch.created",
        metadata=build_certificate_created_audit_metadata(
            certificate_number=payload.certificate_number,
            claim_batch_id=payload.claim_batch_id,
            gross_value_to_date=gross_value_to_date,
            amount_due_this_certificate_excl_tax=amount_due_this_certificate_excl_tax,
        ),
    )

    db.commit()

    certificate = db.scalar(_certificate_batch_query().where(CertificateBatch.id == certificate_batch.id))
    return _serialize_certificate_batch(certificate)
