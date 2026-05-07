import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class Agreement(Base):
    __tablename__ = "agreements"
    __table_args__ = (
        CheckConstraint(
            "escrow_status IN ('pending', 'funded', 'released', 'disputed', 'refunded')",
            name="ck_escrow_status",
        ),
        CheckConstraint(
            "status IN ('active', 'fulfilled', 'cancelled', 'disputed')",
            name="ck_agreement_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    negotiation_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("negotiations.id"), nullable=True)
    match_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("symbiosis_matches.id"), nullable=False)
    sender_org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    receiver_org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    agreed_price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    agreed_volume_kg: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivery_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(50), nullable=True)
    escrow_status: Mapped[str] = mapped_column(String(30), default="pending")
    blockchain_tx_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active")
    signed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
