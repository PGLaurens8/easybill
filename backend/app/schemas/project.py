from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    organization_id: UUID
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    client_name: str | None = None
    currency_code: str = Field(default="ZAR", min_length=3, max_length=3)
    retention_percent_default: Decimal | None = None
    tax_percent_default: Decimal | None = None


class ProjectRead(BaseModel):
    id: UUID
    organization_id: UUID
    code: str
    name: str
    description: str | None
    client_name: str | None
    currency_code: str
    retention_percent_default: Decimal | None
    tax_percent_default: Decimal | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
