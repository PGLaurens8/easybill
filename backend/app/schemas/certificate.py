from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class CertificateLineAdjustment(BaseModel):
    """The QS's certified quantity for a claimed line, where it differs from what was claimed."""

    boq_item_id: UUID
    certified_quantity_this_period: Decimal
    certified_materials_on_site_value: Decimal | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("certified_quantity_this_period", "certified_materials_on_site_value")
    @classmethod
    def validate_non_negative(cls, value: Decimal | None) -> Decimal | None:
        if value is not None and value < 0:
            raise ValueError("Certified values cannot be negative")
        return value


class CertificateValuationRequest(BaseModel):
    """Value a certificate for a claim, or (claim_batch_id omitted) a claim-less one such as a retention release."""

    organization_id: UUID
    claim_batch_id: UUID | None = None
    contract_id: UUID | None = None
    # Retention release and deductions depend on the issue date; defaults to today.
    issue_date: date | None = None
    adjustments: list[CertificateLineAdjustment] = Field(default_factory=list, max_length=5000)

    @model_validator(mode="after")
    def validate_unique_adjustments(self) -> "CertificateValuationRequest":
        if self.claim_batch_id is None and self.contract_id is None:
            raise ValueError("Provide the claim to certify, or the contract for a certificate without a claim")
        ids = [adjustment.boq_item_id for adjustment in self.adjustments]
        if len(ids) != len(set(ids)):
            raise ValueError("Each BOQ item can only be adjusted once")
        return self


class CertificateBatchCreate(CertificateValuationRequest):
    project_id: UUID
    contract_id: UUID  # type: ignore[assignment]
    # Omit to use the next CERT-nnn number for the contract.
    certificate_number: str | None = Field(default=None, min_length=1, max_length=50)
    issue_date: date


class CertificateStatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=50)


class CertificateLineValuation(BaseModel):
    boq_item_id: UUID
    item_code: str
    description: str
    unit: str
    rate: Decimal
    contract_quantity: Decimal
    previous_certified_quantity: Decimal
    claimed_quantity_this_period: Decimal
    certified_quantity_this_period: Decimal
    work_value_to_date: Decimal
    materials_on_site_value_to_date: Decimal | None
    notes: str | None


class CertificateValuationRead(BaseModel):
    """What a certificate would look like if issued now. Nothing is saved."""

    claim_batch_id: UUID | None
    contract_id: UUID
    contract_value: Decimal
    previous_net_certified_excl_tax: Decimal
    gross_value_to_date: Decimal
    retention_held_to_date: Decimal
    retention_released_to_date: Decimal
    contra_charges_to_date: Decimal
    net_certified_to_date_excl_tax: Decimal
    amount_due_this_certificate_excl_tax: Decimal
    tax_this_certificate: Decimal
    amount_due_this_certificate_incl_tax: Decimal
    lines: list[CertificateLineValuation]


class CertificateLineRead(CertificateLineValuation):
    id: UUID
    variation_value_to_date: Decimal | None
    preliminaries_value_to_date: Decimal | None
    dayworks_value_to_date: Decimal | None
    escalation_value_to_date: Decimal | None
    contra_charge_value_to_date: Decimal | None
    other_deduction_value_to_date: Decimal | None


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
    retention_released_to_date: Decimal
    contra_charges_to_date: Decimal
    net_certified_to_date_excl_tax: Decimal
    amount_due_this_certificate_excl_tax: Decimal
    tax_this_certificate: Decimal
    amount_due_this_certificate_incl_tax: Decimal
    issued_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime
    lines: list[CertificateLineRead]
