from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime


class RegisterRequest(BaseModel):
    org_name: str = Field(..., min_length=2, max_length=255)
    org_type: str = Field(..., pattern="^(maker|recycler|transporter|regulator)$")
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=255)
    tax_id: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    org_id: str
    org_name: str
    role: str


class UserResponse(BaseModel):
    id: UUID
    org_id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
