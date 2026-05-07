import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, Float, Boolean, DateTime, Date, ForeignKey, Text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class ESGRecord(Base):
    __tablename__ = "esg_records"
    __table_args__ = (
        CheckConstraint(
            "record_type IN ('co2_offset', 'material_reuse', 'waste_diversion', 'scope3_emission')",
            name="ck_esg_record_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    agreement_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("agreements.id"), nullable=True)
    shipment_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("shipments.id"), nullable=True)
    record_type: Mapped[str] = mapped_column(String(30), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    blockchain_tx_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class GreenCertificate(Base):
    __tablename__ = "green_certificates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    agreement_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agreements.id"), nullable=False)
    certificate_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    co2_saved_kg: Mapped[float] = mapped_column(Float, nullable=False)
    material_reused_kg: Mapped[float] = mapped_column(Float, nullable=False)
    blockchain_tx_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class ComplianceDocument(Base):
    __tablename__ = "compliance_documents"
    __table_args__ = (
        CheckConstraint(
            "doc_type IN ('iso_14001', 'iso_9001', 'environmental_permit', 'business_license', 'hazmat_cert')",
            name="ck_doc_type",
        ),
        CheckConstraint(
            "status IN ('pending', 'approved', 'expired', 'rejected')",
            name="ck_doc_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    issued_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="compliance_documents")
