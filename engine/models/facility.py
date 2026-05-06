import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Float, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Facility(Base):
    __tablename__ = "facilities"
    __table_args__ = (
        CheckConstraint(
            "facility_type IN ('factory', 'warehouse', 'processing_plant', 'port')",
            name="ck_facility_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    facility_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capacity_kg: Mapped[float] = mapped_column(Float, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="facilities")
