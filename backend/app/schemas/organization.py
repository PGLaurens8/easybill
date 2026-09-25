from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.commercial import InvitationStatus, MembershipRole


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
    """Internal: used when an invitation is accepted. There is no API to add someone without consent."""

    user_id: UUID
    role: MembershipRole
    email: str | None = None


class OrganizationInvitationCreate(BaseModel):
    email: EmailStr
    role: MembershipRole


class OrganizationInvitationRead(BaseModel):
    id: UUID
    organization_id: UUID
    email: str
    role: MembershipRole
    status: InvitationStatus
    invited_by_user_id: UUID
    responded_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MyInvitationRead(BaseModel):
    """An invitation addressed to the signed-in user."""

    id: UUID
    organization_id: UUID
    organization_name: str
    role: MembershipRole
    created_at: datetime


class OrganizationMembershipUpdate(BaseModel):
    role: MembershipRole
