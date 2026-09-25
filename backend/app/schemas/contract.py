from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

Percent = Decimal


def _check_percent(value: Decimal | None, name: str) -> None:
    if value is not None and not (Decimal("0") <= value <= Decimal("100")):
        raise ValueError(f"{name} must be between 0 and 100")


class ContractCreate(BaseModel):
    organization_id: UUID
    project_id: UUID
    code: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=2, max_length=255)
    subcontractor_name: str | None = Field(default=None, max_length=255)
    subcontractor_user_id: UUID | None = None
    currency_code: str = Field(default="ZAR", min_length=3, max_length=3)
    retention_percent: Percent = Decimal("0")
    retention_cap_percent: Percent | None = None
    tax_percent: Percent = Decimal("0")
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_percentages(self) -> "ContractCreate":
        _check_percent(self.retention_percent, "Retention")
        _check_percent(self.retention_cap_percent, "Retention cap")
        _check_percent(self.tax_percent, "Tax")
        return self


class ContractUpdate(BaseModel):
    """Partial update. Only fields that are sent are changed."""

    title: str | None = Field(default=None, min_length=2, max_length=255)
    subcontractor_name: str | None = Field(default=None, max_length=255)
    subcontractor_user_id: UUID | None = None
    retention_percent: Percent | None = None
    retention_cap_percent: Percent | None = None
    tax_percent: Percent | None = None
    status: str | None = None

    @model_validator(mode="after")
    def validate_percentages(self) -> "ContractUpdate":
        _check_percent(self.retention_percent, "Retention")
        _check_percent(self.retention_cap_percent, "Retention cap")
        _check_percent(self.tax_percent, "Tax")
        return self


class ContractRead(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    code: str
    title: str
    subcontractor_name: str | None
    subcontractor_user_id: UUID | None
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
