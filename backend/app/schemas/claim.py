from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ClaimLineCreate(BaseModel):
    boq_item_id: UUID
    previous_certified_quantity: Decimal = Decimal("0")
    claimed_quantity_this_period: Decimal = Decimal("0")
    claimed_materials_on_site_value: Decimal | None = None
    notes: str | None = None


class ClaimBatchCreate(BaseModel):
    organization_id: UUID
    project_id: UUID
    contract_id: UUID
    period_number: int = Field(ge=1)
    remarks: str | None = None
    lines: list[ClaimLineCreate] = Field(default_factory=list)


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
