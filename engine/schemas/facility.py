from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class FacilityCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: str | None = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    facility_type: str | None = Field(None, pattern="^(factory|warehouse|processing_plant|port)$")
    capacity_kg: float = Field(default=0, ge=0)


class FacilityUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    facility_type: str | None = None
    capacity_kg: float | None = None
    is_active: bool | None = None


class FacilityResponse(BaseModel):
    id: UUID
    org_id: UUID
    name: str
    address: str | None
    latitude: float
    longitude: float
    facility_type: str | None
    capacity_kg: float
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
