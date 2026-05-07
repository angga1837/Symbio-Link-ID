from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class MatchResponse(BaseModel):
    id: UUID
    listing_id: UUID
    sender_org_id: UUID
    receiver_org_id: UUID
    sender_facility: UUID
    receiver_facility: UUID
    matched_volume_kg: float
    transport_cost: float | None
    transport_distance_km: float | None
    co2_saved_kg: float | None
    milp_objective_value: float | None
    match_score: float | None
    status: str
    proposed_at: datetime
    expires_at: datetime

    model_config = {"from_attributes": True}
