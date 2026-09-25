from dataclasses import dataclass
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.models.commercial import MembershipRole


class CurrentUser(BaseModel):
    id: UUID
    email: EmailStr | None = None
    # Invitations are matched by email, so only a verified address may accept one.
    email_confirmed: bool = False


@dataclass(frozen=True)
class OrgAccess:
    """The caller's identity and role inside the organization named by X-Organization-Id."""

    organization_id: UUID
    user_id: UUID
    role: MembershipRole
    email: str | None = None

    @property
    def is_contractor(self) -> bool:
        return self.role == MembershipRole.contractor

    @property
    def contractor_scope(self) -> UUID | None:
        """User id to restrict contract visibility to, or None for full organization visibility."""
        return self.user_id if self.is_contractor else None
