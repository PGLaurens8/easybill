from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.commercial import AuditEvent, ClaimStatus, MembershipRole

AuditMetadata = dict[str, str | int | bool | None]


def build_claim_created_audit_metadata(
    *,
    period_number: int,
    project_id: UUID,
    contract_id: UUID,
    revision_number: int,
    line_count: int,
) -> AuditMetadata:
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
    remarks: str | None = None,
) -> AuditMetadata:
    metadata: AuditMetadata = {
        "previous_status": previous_status.value,
        "next_status": next_status.value,
        "actor_role": actor_role.value,
        "remarks_present": remarks_present,
    }
    if remarks:
        metadata["remarks"] = remarks
    return metadata


def build_certificate_created_audit_metadata(
    *,
    certificate_number: str,
    claim_batch_id: UUID | None,
    gross_value_to_date: Decimal,
    amount_due_this_certificate_excl_tax: Decimal,
    adjusted_line_count: int = 0,
) -> AuditMetadata:
    return {
        "certificate_number": certificate_number,
        "claim_batch_id": str(claim_batch_id) if claim_batch_id else None,
        "gross_value_to_date": str(gross_value_to_date),
        "amount_due_this_certificate_excl_tax": str(amount_due_this_certificate_excl_tax),
        "adjusted_line_count": adjusted_line_count,
    }


def record_audit_event(
    db: Session,
    *,
    organization_id: UUID,
    entity_type: str,
    entity_id: UUID,
    actor_user_id: UUID | None,
    action: str,
    metadata: AuditMetadata,
) -> None:
    db.add(
        AuditEvent(
            organization_id=organization_id,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_user_id=actor_user_id,
            action=action,
            occurred_at=datetime.now(UTC),
            audit_metadata=metadata,
        )
    )
