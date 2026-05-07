from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class PurityCheckRequest(BaseModel):
    ph_level: float = Field(default=7.0, ge=0, le=14)
    moisture_pct: float = Field(default=10.0, ge=0, le=100)
    volume_kg: float = Field(..., gt=0)
    # Enhanced Digital Material Passport — chemical composition fields
    carbon_pct: float | None = Field(None, ge=0, le=100, description="Carbon content (%)")
    hydrogen_pct: float | None = Field(None, ge=0, le=100, description="Hydrogen content (%)")
    ash_pct: float | None = Field(None, ge=0, le=100, description="Ash content (%)")


class PurityCheckResponse(BaseModel):
    ml_purity_score: float
    meets_threshold: bool
    requires_remediation: bool
    threshold: float
    ceiling: float
    recommendation: str
    chemical_features_used: bool = False


class MaterialListingCreate(BaseModel):
    facility_id: UUID
    material_type: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    volume_kg: float = Field(..., gt=0)
    supply_mode: str = Field(default="batch", pattern="^(continuous|batch)$")
    frequency_days: int | None = None
    ph_level: float | None = Field(None, ge=0, le=14)
    moisture_pct: float | None = Field(None, ge=0, le=100)
    toxicity_class: str | None = Field(None, pattern="^(non_toxic|low|moderate|high|hazardous)$")
    chemical_composition: dict | None = None
    # Enhanced chemical fields
    carbon_pct: float | None = Field(None, ge=0, le=100)
    hydrogen_pct: float | None = Field(None, ge=0, le=100)
    ash_pct: float | None = Field(None, ge=0, le=100)
    image_urls: list[str] | None = None


class MaterialListingUpdate(BaseModel):
    description: str | None = None
    volume_kg: float | None = Field(None, gt=0)
    supply_mode: str | None = None
    frequency_days: int | None = None
    ph_level: float | None = None
    moisture_pct: float | None = None
    toxicity_class: str | None = None
    chemical_composition: dict | None = None
    carbon_pct: float | None = None
    hydrogen_pct: float | None = None
    ash_pct: float | None = None
    status: str | None = None


class MaterialListingResponse(BaseModel):
    id: UUID
    org_id: UUID
    facility_id: UUID
    material_type: str
    description: str | None
    volume_kg: float
    supply_mode: str
    frequency_days: int | None
    ph_level: float | None
    moisture_pct: float | None
    toxicity_class: str | None
    chemical_composition: dict | None
    carbon_pct: float | None
    hydrogen_pct: float | None
    ash_pct: float | None
    ml_purity_score: float | None
    ml_model_version: str | None
    requires_remediation: bool
    status: str
    listed_at: datetime
    expires_at: datetime | None
    image_urls: list[str] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
