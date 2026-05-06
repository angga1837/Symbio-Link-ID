from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from database import get_db
from middleware.auth import get_current_user
from models.match import SymbiosisMatch
from models.material_listing import MaterialListing
from models.user import User
from schemas.match import MatchResponse
from services.matching_engine import run_matching

router = APIRouter(prefix="/api/v1/matches", tags=["Matchmaking"])


@router.post("/{listing_id}/find", response_model=list[MatchResponse])
async def find_matches(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Run MILP optimizer to find symbiosis matches for a listed material."""
    listing = await db.get(MaterialListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Not your listing")
    if listing.status != "listed":
        raise HTTPException(status_code=400, detail="Listing must be in 'listed' status to find matches")

    matches = await run_matching(str(listing_id), db)
    if not matches:
        raise HTTPException(status_code=404, detail="No optimal matches found. Try adding more facilities.")

    listing.status = "matched"
    await db.flush()
    return matches


@router.get("/my", response_model=list[MatchResponse])
async def my_matches(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get all matches involving my organization (as sender or receiver)."""
    query = (
        select(SymbiosisMatch)
        .where(
            (SymbiosisMatch.sender_org_id == user.org_id)
            | (SymbiosisMatch.receiver_org_id == user.org_id)
        )
        .order_by(SymbiosisMatch.proposed_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get details of a specific match."""
    match = await db.get(SymbiosisMatch, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.patch("/{match_id}/accept", response_model=MatchResponse)
async def accept_match(
    match_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Receiver accepts a proposed match — opens negotiation."""
    match = await db.get(SymbiosisMatch, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.receiver_org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Only the receiver can accept a match")
    if match.status != "proposed":
        raise HTTPException(status_code=400, detail=f"Match is already '{match.status}'")
    match.status = "accepted"
    await db.flush()
    await db.refresh(match)
    return match


@router.patch("/{match_id}/reject", response_model=MatchResponse)
async def reject_match(
    match_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Reject a proposed match."""
    match = await db.get(SymbiosisMatch, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.receiver_org_id != user.org_id and match.sender_org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Not your match")
    match.status = "rejected"
    await db.flush()
    await db.refresh(match)
    return match
