from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    org_type: str = Field(..., pattern="^(maker|recycler|transporter|regulator)$")
    tax_id: str | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = None
    tax_id: str | None = None


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    org_type: str
    tax_id: str | None
    verified: bool
    kyc_status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
