from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class NegotiationCreate(BaseModel):
    match_id: UUID
    proposed_price_per_kg: float = Field(..., gt=0)
    proposed_pickup_date: datetime | None = None
    proposed_delivery_date: datetime | None = None
    payment_terms: str = Field(default="net_30", pattern="^(prepaid|net_15|net_30|escrow)$")
    notes: str | None = None


class CounterOfferRequest(BaseModel):
    proposed_price_per_kg: float = Field(..., gt=0)
    proposed_pickup_date: datetime | None = None
    proposed_delivery_date: datetime | None = None
    payment_terms: str | None = None
    notes: str | None = None


class NegotiationResponse(BaseModel):
    id: UUID
    match_id: UUID
    initiated_by: UUID
    status: str
    proposed_price_per_kg: float | None
    proposed_pickup_date: datetime | None
    proposed_delivery_date: datetime | None
    payment_terms: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    message: str = Field(..., min_length=1)
    attachments: list[str] | None = None


class MessageResponse(BaseModel):
    id: UUID
    negotiation_id: UUID
    sender_org_id: UUID
    sender_user_id: UUID
    message: str
    attachments: list[str] | None
    created_at: datetime

    model_config = {"from_attributes": True}
