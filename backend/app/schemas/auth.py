from uuid import UUID

from pydantic import BaseModel, EmailStr


class CurrentUser(BaseModel):
    id: UUID
    email: EmailStr | None = None
