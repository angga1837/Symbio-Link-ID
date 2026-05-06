from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from database import get_db
from middleware.auth import get_current_user
from models.negotiation import Negotiation, NegotiationMessage
from models.match import SymbiosisMatch
from models.agreement import Agreement
from models.user import User
from schemas.negotiation import (
    NegotiationCreate, NegotiationResponse,
    CounterOfferRequest, MessageCreate, MessageResponse,
)
from services.blockchain_service import commit_to_ledger

router = APIRouter(prefix="/api/v1/negotiations", tags=["Negotiation Room"])


@router.post("/", response_model=NegotiationResponse, status_code=201)
async def open_negotiation(
    data: NegotiationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Open a negotiation room for an accepted match."""
    match = await db.get(SymbiosisMatch, data.match_id)
    if not match or match.status not in ("accepted", "negotiating"):
        raise HTTPException(status_code=400, detail="Match must be accepted first")

    neg = Negotiation(
        match_id=data.match_id,
        initiated_by=user.org_id,
        proposed_price_per_kg=data.proposed_price_per_kg,
        proposed_pickup_date=data.proposed_pickup_date,
        proposed_delivery_date=data.proposed_delivery_date,
        payment_terms=data.payment_terms,
        notes=data.notes,
    )
    db.add(neg)
    match.status = "negotiating"
    await db.flush()
    await db.refresh(neg)
    return neg


@router.get("/my", response_model=list[NegotiationResponse])
async def my_negotiations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all negotiations where my org is involved."""
    # Get match IDs involving my org
    match_query = select(SymbiosisMatch.id).where(
        (SymbiosisMatch.sender_org_id == user.org_id)
        | (SymbiosisMatch.receiver_org_id == user.org_id)
    )
    neg_query = (
        select(Negotiation)
        .where(Negotiation.match_id.in_(match_query))
        .order_by(Negotiation.created_at.desc())
    )
    result = await db.execute(neg_query)
    return result.scalars().all()


@router.get("/{neg_id}", response_model=NegotiationResponse)
async def get_negotiation(
    neg_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    neg = await db.get(Negotiation, neg_id)
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    return neg


@router.post("/{neg_id}/counter", response_model=NegotiationResponse)
async def counter_offer(
    neg_id: UUID,
    data: CounterOfferRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Submit a counter-offer in the negotiation."""
    neg = await db.get(Negotiation, neg_id)
    if not neg or neg.status not in ("open", "counter_offered"):
        raise HTTPException(status_code=400, detail="Negotiation not open for counter-offers")

    neg.proposed_price_per_kg = data.proposed_price_per_kg
    if data.proposed_pickup_date:
        neg.proposed_pickup_date = data.proposed_pickup_date
    if data.proposed_delivery_date:
        neg.proposed_delivery_date = data.proposed_delivery_date
    if data.payment_terms:
        neg.payment_terms = data.payment_terms
    if data.notes:
        neg.notes = data.notes
    neg.status = "counter_offered"
    await db.flush()
    await db.refresh(neg)
    return neg


@router.post("/{neg_id}/accept")
async def accept_negotiation(
    neg_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Accept negotiation terms — auto-generates a digital agreement and commits to blockchain."""
    neg = await db.get(Negotiation, neg_id)
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    if neg.status not in ("open", "counter_offered"):
        raise HTTPException(status_code=400, detail="Negotiation already resolved")

    match = await db.get(SymbiosisMatch, neg.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Commit agreement to blockchain
    tx_hash = await commit_to_ledger({
        "type": "AGREEMENT_SIGNED",
        "match_id": str(match.id),
        "sender_org": str(match.sender_org_id),
        "receiver_org": str(match.receiver_org_id),
        "volume_kg": match.matched_volume_kg,
        "price_per_kg": neg.proposed_price_per_kg,
        "payment_terms": neg.payment_terms,
    })

    agreement = Agreement(
        negotiation_id=neg.id,
        match_id=match.id,
        sender_org_id=match.sender_org_id,
        receiver_org_id=match.receiver_org_id,
        agreed_price_per_kg=neg.proposed_price_per_kg,
        agreed_volume_kg=match.matched_volume_kg,
        pickup_date=neg.proposed_pickup_date,
        delivery_date=neg.proposed_delivery_date,
        payment_terms=neg.payment_terms,
        blockchain_tx_hash=tx_hash,
    )
    db.add(agreement)

    neg.status = "accepted"
    match.status = "contracted"

    await db.flush()
    await db.refresh(agreement)
    return {
        "agreement_id": str(agreement.id),
        "blockchain_tx_hash": tx_hash,
        "status": "Agreement created and committed to ledger",
    }


@router.post("/{neg_id}/reject", response_model=NegotiationResponse)
async def reject_negotiation(
    neg_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    neg = await db.get(Negotiation, neg_id)
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    neg.status = "rejected"
    await db.flush()
    await db.refresh(neg)
    return neg


# --- Messages ---

@router.get("/{neg_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    neg_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NegotiationMessage)
        .where(NegotiationMessage.negotiation_id == neg_id)
        .order_by(NegotiationMessage.created_at.asc())
    )
    return result.scalars().all()


@router.post("/{neg_id}/messages", response_model=MessageResponse, status_code=201)
async def send_message(
    neg_id: UUID,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    msg = NegotiationMessage(
        negotiation_id=neg_id,
        sender_org_id=user.org_id,
        sender_user_id=user.id,
        message=data.message,
        attachments=data.attachments or [],
    )
    db.add(msg)
    await db.flush()
    await db.refresh(msg)
    return msg
