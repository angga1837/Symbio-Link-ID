import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, ForeignKey, Text, CheckConstraint, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Negotiation(Base):
    __tablename__ = "negotiations"
    __table_args__ = (
        CheckConstraint(
            "status IN ('open', 'counter_offered', 'accepted', 'rejected', 'expired')",
            name="ck_neg_status",
        ),
        CheckConstraint(
            "payment_terms IN ('prepaid', 'net_15', 'net_30', 'escrow')",
            name="ck_payment_terms",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    match_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("symbiosis_matches.id"), nullable=False)
    initiated_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="open")
    proposed_price_per_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    proposed_pickup_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    proposed_delivery_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    messages = relationship("NegotiationMessage", back_populates="negotiation", cascade="all, delete-orphan")


class NegotiationMessage(Base):
    __tablename__ = "negotiation_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    negotiation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("negotiations.id", ondelete="CASCADE"), nullable=False)
    sender_org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    sender_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    attachments: Mapped[list | None] = mapped_column(ARRAY(Text), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    negotiation = relationship("Negotiation", back_populates="messages")
