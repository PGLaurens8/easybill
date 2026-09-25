from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class ClaimLineCreate(BaseModel):
    boq_item_id: UUID
    previous_certified_quantity: Decimal = Decimal("0")
    claimed_quantity_this_period: Decimal = Decimal("0")
    claimed_materials_on_site_value: Decimal | None = None
    notes: str | None = None

    @field_validator(
        "previous_certified_quantity",
        "claimed_quantity_this_period",
        "claimed_materials_on_site_value",
    )
    @classmethod
    def validate_non_negative_decimal(cls, value: Decimal | None) -> Decimal | None:
        if value is not None and value < 0:
            raise ValueError("Claim values cannot be negative")
        return value


class ClaimBatchCreate(BaseModel):
    organization_id: UUID
    project_id: UUID
    contract_id: UUID
    # Omit to use the next period number for the contract.
    period_number: int | None = Field(default=None, ge=1)
    remarks: str | None = None
    lines: list[ClaimLineCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_lines_present(self) -> "ClaimBatchCreate":
        if not self.lines:
            raise ValueError("At least one claim line is required")
        return self


class ClaimBatchUpdate(BaseModel):
    """Replaces the lines of a Draft claim, e.g. after it was rejected and reopened."""

    remarks: str | None = None
    lines: list[ClaimLineCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_lines_present(self) -> "ClaimBatchUpdate":
        if not self.lines:
            raise ValueError("At least one claim line is required")
        return self


class ClaimBatchStatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=50)
    remarks: str | None = None


class ClaimLineRead(BaseModel):
    id: UUID
    boq_item_id: UUID
    item_code: str
    trade_code: str | None
    description: str
    unit: str
    rate: Decimal
    contract_quantity: Decimal
    previous_certified_quantity: Decimal
    claimed_quantity_this_period: Decimal
    claimed_materials_on_site_value: Decimal | None
    line_value: Decimal
    notes: str | None


class ClaimBatchRead(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    contract_id: UUID
    period_number: int
    status: str
    submitted_by_user_id: UUID | None
    submitted_at: datetime | None
    reviewed_by_user_id: UUID | None
    reviewed_at: datetime | None
    remarks: str | None
    created_at: datetime
    updated_at: datetime
    total_claimed_amount: Decimal
    lines: list[ClaimLineRead]
