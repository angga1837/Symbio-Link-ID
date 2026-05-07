import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Text, CheckConstraint, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class MaterialListing(Base):
    __tablename__ = "material_listings"
    __table_args__ = (
        CheckConstraint("volume_kg > 0", name="ck_volume_positive"),
        CheckConstraint(
            "supply_mode IN ('continuous', 'batch')",
            name="ck_supply_mode",
        ),
        CheckConstraint(
            "toxicity_class IN ('non_toxic', 'low', 'moderate', 'high', 'hazardous')",
            name="ck_toxicity_class",
        ),
        CheckConstraint(
            "status IN ('draft', 'listed', 'matched', 'in_transit', 'processed', 'archived')",
            name="ck_listing_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id"), nullable=False)
    material_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    volume_kg: Mapped[float] = mapped_column(Float, nullable=False)
    supply_mode: Mapped[str] = mapped_column(String(20), default="batch")
    frequency_days: Mapped[int | None] = mapped_column(nullable=True)

    # Chemical specifications
    ph_level: Mapped[float | None] = mapped_column(Float, nullable=True)
    moisture_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    toxicity_class: Mapped[str | None] = mapped_column(String(20), nullable=True)
    chemical_composition: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Enhanced Digital Material Passport — granular chemical composition
    carbon_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    hydrogen_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    ash_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    # AI Trust Layer
    ml_purity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    ml_model_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    requires_remediation: Mapped[bool] = mapped_column(Boolean, default=False)

    # Lifecycle
    status: Mapped[str] = mapped_column(String(30), default="draft")
    listed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    image_urls: Mapped[list | None] = mapped_column(ARRAY(Text), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
