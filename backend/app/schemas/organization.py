from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.commercial import MembershipRole


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")


class OrganizationRead(BaseModel):
    id: UUID
    name: str
    slug: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrganizationMembershipRead(BaseModel):
    id: UUID
    organization_id: UUID
    user_id: UUID
    email: str | None
    role: MembershipRole
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrganizationMembershipCreate(BaseModel):
    """Add a member by email (preferred) or by their user id."""

    email: EmailStr | None = None
    user_id: UUID | None = None
    role: MembershipRole

    @model_validator(mode="after")
    def validate_identity(self) -> "OrganizationMembershipCreate":
        if self.email is None and self.user_id is None:
            raise ValueError("Provide the member's email address or user id")
        return self


class OrganizationMembershipUpdate(BaseModel):
    role: MembershipRole
