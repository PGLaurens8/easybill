from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

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
    role: MembershipRole
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrganizationMembershipCreate(BaseModel):
    user_id: UUID
    role: MembershipRole


class OrganizationMembershipUpdate(BaseModel):
    role: MembershipRole
