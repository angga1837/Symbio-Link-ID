import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import String, Float, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


def _default_expiry():
    return datetime.now(timezone.utc) + timedelta(days=7)


class SymbiosisMatch(Base):
    __tablename__ = "symbiosis_matches"
    __table_args__ = (
        CheckConstraint(
            "status IN ('proposed', 'accepted', 'negotiating', 'contracted', 'rejected', 'expired')",
            name="ck_match_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("material_listings.id"), nullable=False)
    sender_org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    receiver_org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    sender_facility: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id"), nullable=False)
    receiver_facility: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id"), nullable=False)
    matched_volume_kg: Mapped[float] = mapped_column(Float, nullable=False)
    transport_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    transport_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    co2_saved_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    milp_objective_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="proposed")
    proposed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_default_expiry)
