from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ContractCreate(BaseModel):
    organization_id: UUID
    project_id: UUID
    code: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=2, max_length=255)
    currency_code: str = Field(default="ZAR", min_length=3, max_length=3)
    retention_percent: Decimal = Decimal("0")
    retention_cap_percent: Decimal | None = None
    tax_percent: Decimal = Decimal("0")
    start_date: date | None = None
    end_date: date | None = None


class ContractRead(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    code: str
    title: str
    currency_code: str
    retention_percent: Decimal
    retention_cap_percent: Decimal | None
    tax_percent: Decimal
    start_date: date | None
    end_date: date | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
