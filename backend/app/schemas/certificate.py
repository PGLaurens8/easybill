from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class CertificateBatchCreate(BaseModel):
    organization_id: UUID
    project_id: UUID
    contract_id: UUID
    claim_batch_id: UUID
    certificate_number: str = Field(min_length=1, max_length=50)
    issue_date: date


class CertificateLineRead(BaseModel):
    id: UUID
    boq_item_id: UUID
    claimed_quantity_this_period: Decimal
    certified_quantity_this_period: Decimal
    previous_certified_quantity: Decimal
    rate: Decimal
    work_value_to_date: Decimal
    materials_on_site_value_to_date: Decimal | None
    variation_value_to_date: Decimal | None
    preliminaries_value_to_date: Decimal | None
    dayworks_value_to_date: Decimal | None
    escalation_value_to_date: Decimal | None
    contra_charge_value_to_date: Decimal | None
    other_deduction_value_to_date: Decimal | None
    notes: str | None

    model_config = {"from_attributes": True}


class CertificateBatchRead(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    contract_id: UUID
    claim_batch_id: UUID | None
    certificate_number: str
    status: str
    issue_date: date
    previous_net_certified_excl_tax: Decimal
    gross_value_to_date: Decimal
    retention_held_to_date: Decimal
    net_certified_to_date_excl_tax: Decimal
    amount_due_this_certificate_excl_tax: Decimal
    tax_this_certificate: Decimal
    amount_due_this_certificate_incl_tax: Decimal
    issued_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime
    lines: list[CertificateLineRead]

    model_config = {"from_attributes": True}
