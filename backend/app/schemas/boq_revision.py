from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class BoqItemCreate(BaseModel):
    item_code: str = Field(min_length=1, max_length=50)
    trade_code: str | None = Field(default=None, max_length=50)
    description: str = Field(min_length=2)
    unit: str = Field(min_length=1, max_length=20)
    contract_quantity: Decimal
    rate: Decimal
    order_index: int = Field(ge=0)


class BoqRevisionCreate(BaseModel):
    organization_id: UUID
    project_id: UUID
    contract_id: UUID
    revision_number: int = Field(ge=1)
    items: list[BoqItemCreate] = Field(default_factory=list)


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
