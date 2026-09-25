from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class VariationItem(BaseModel):
    item_code: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=2, max_length=2000)
    unit: str = Field(min_length=1, max_length=20)
    quantity: Decimal
    rate: Decimal

    @field_validator("quantity", "rate")
    @classmethod
    def validate_non_negative(cls, value: Decimal) -> Decimal:
        if value < 0:
            raise ValueError("Quantities and rates cannot be negative")
        return value


class VariationOrderCreate(BaseModel):
    organization_id: UUID
    contract_id: UUID
    title: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    items: list[VariationItem] = Field(min_length=1, max_length=500)
    # QS / commercial roles can record an already-instructed variation as approved in one step.
    approve_now: bool = False

    @model_validator(mode="after")
    def validate_unique_codes(self) -> "VariationOrderCreate":
        codes = [item.item_code.strip().lower() for item in self.items]
        if len(codes) != len(set(codes)):
            raise ValueError("Item codes must be unique within a variation")
        return self


class VariationDecision(BaseModel):
    approve: bool
    remarks: str | None = Field(default=None, max_length=2000)


class VariationOrderRead(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    contract_id: UUID
    number: str
    title: str
    description: str | None
    status: str
    items: list[VariationItem]
    value: Decimal
    submitted_by_user_id: UUID
    decided_by_user_id: UUID | None
    decided_at: datetime | None
    decision_remarks: str | None
    created_at: datetime


class ContraChargeCreate(BaseModel):
    organization_id: UUID
    contract_id: UUID
    description: str = Field(min_length=2, max_length=2000)
    amount: Decimal = Field(gt=0)
    charge_date: date | None = None


class ContraChargeRead(BaseModel):
    id: UUID
    contract_id: UUID
    description: str
    amount: Decimal
    charge_date: date
    certificate_batch_id: UUID | None
    created_by_user_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
