from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class BoqItemCreate(BaseModel):
    item_code: str = Field(min_length=1, max_length=50)
    trade_code: str | None = Field(default=None, max_length=50)
    description: str = Field(min_length=2)
    unit: str = Field(min_length=1, max_length=20)
    contract_quantity: Decimal
    rate: Decimal
    order_index: int = Field(ge=0)

    @field_validator("contract_quantity", "rate")
    @classmethod
    def validate_non_negative(cls, value: Decimal) -> Decimal:
        if value < 0:
            raise ValueError("Quantities and rates cannot be negative")
        return value


class BoqRevisionCreate(BaseModel):
    organization_id: UUID
    project_id: UUID
    contract_id: UUID
    # Omit to use the next revision number for the contract.
    revision_number: int | None = Field(default=None, ge=1)
    items: list[BoqItemCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_items(self) -> "BoqRevisionCreate":
        if not self.items:
            raise ValueError("A BOQ revision needs at least one line item")
        codes = [item.item_code.strip().lower() for item in self.items]
        if len(codes) != len(set(codes)):
            raise ValueError("BOQ item codes must be unique within a revision")
        return self


class BoqItemRead(BaseModel):
    id: UUID
    boq_revision_id: UUID
    item_code: str
    trade_code: str | None
    description: str
    unit: str
    contract_quantity: Decimal
    rate: Decimal
    amount: Decimal
    order_index: int

    model_config = {"from_attributes": True}


class BoqRevisionRead(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    contract_id: UUID
    revision_number: int
    status: str
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[BoqItemRead]

    model_config = {"from_attributes": True}
