from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date


class ESGRecordResponse(BaseModel):
    id: UUID
    org_id: UUID
    agreement_id: UUID | None
    shipment_id: UUID | None
    record_type: str
    value: float
    unit: str
    period_start: date | None
    period_end: date | None
    blockchain_tx_hash: str | None
    verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class GreenCertificateResponse(BaseModel):
    id: UUID
    org_id: UUID
    agreement_id: UUID
    certificate_number: str
    co2_saved_kg: float
    material_reused_kg: float
    blockchain_tx_hash: str
    issued_at: datetime
    pdf_url: str | None

    model_config = {"from_attributes": True}


class Scope3LedgerResponse(BaseModel):
    org_id: str
    total_co2_offset_kg: float
    record_count: int
    records: list[ESGRecordResponse]


class DashboardResponse(BaseModel):
    total_co2_saved_kg: float
    total_material_reused_kg: float
    cost_savings_pct: float
    material_reuse_pct: float
    green_certificates_issued: int
    monthly_co2_trend: list[dict]
    net_zero_target_year: int = 2060


class AgreementResponse(BaseModel):
    id: UUID
    negotiation_id: UUID | None
    match_id: UUID
    sender_org_id: UUID
    receiver_org_id: UUID
    agreed_price_per_kg: float
    agreed_volume_kg: float
    pickup_date: datetime | None
    delivery_date: datetime | None
    payment_terms: str | None
    escrow_status: str
    blockchain_tx_hash: str | None
    status: str
    signed_at: datetime

    model_config = {"from_attributes": True}


class ShipmentResponse(BaseModel):
    id: UUID
    agreement_id: UUID
    transporter_org: UUID | None
    status: str
    pickup_lat: float | None
    pickup_lng: float | None
    delivery_lat: float | None
    delivery_lng: float | None
    distance_km: float | None
    vehicle_id: str | None
    status_history: list | None
    blockchain_hashes: list[str] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShipmentStatusUpdate(BaseModel):
    status: str
    vehicle_id: str | None = None
    notes: str | None = None


class ComplianceDocCreate(BaseModel):
    doc_type: str
    file_url: str
    file_hash: str | None = None
    issued_date: date | None = None
    expiry_date: date | None = None


class ComplianceDocResponse(BaseModel):
    id: UUID
    org_id: UUID
    doc_type: str
    file_url: str
    file_hash: str | None
    issued_date: date | None
    expiry_date: date | None
    status: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}
