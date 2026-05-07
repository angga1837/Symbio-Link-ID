from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from database import get_db
from middleware.auth import get_current_user
from models.agreement import Agreement
from models.user import User
from schemas.esg import AgreementResponse
from services.certificate_service import issue_green_certificate

router = APIRouter(prefix="/api/v1/agreements", tags=["Agreements"])


@router.get("/my", response_model=list[AgreementResponse])
async def my_agreements(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all agreements involving my organization."""
    query = (
        select(Agreement)
        .where(
            (Agreement.sender_org_id == user.org_id)
            | (Agreement.receiver_org_id == user.org_id)
        )
        .order_by(Agreement.signed_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{agreement_id}", response_model=AgreementResponse)
async def get_agreement(
    agreement_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    agreement = await db.get(Agreement, agreement_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    return agreement


@router.patch("/{agreement_id}/fulfill")
async def fulfill_agreement(
    agreement_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mark agreement as fulfilled and auto-issue a Green Certificate."""
    agreement = await db.get(Agreement, agreement_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    if agreement.status != "active":
        raise HTTPException(status_code=400, detail=f"Agreement is '{agreement.status}', not active")

    agreement.status = "fulfilled"
    agreement.escrow_status = "released"

    # Auto-issue green certificate
    cert = await issue_green_certificate(agreement, db)

    return {
        "agreement_id": str(agreement.id),
        "status": "fulfilled",
        "certificate_number": cert.certificate_number,
        "co2_saved_kg": cert.co2_saved_kg,
        "blockchain_tx_hash": cert.blockchain_tx_hash,
    }


@router.patch("/{agreement_id}/cancel")
async def cancel_agreement(
    agreement_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    agreement = await db.get(Agreement, agreement_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    if agreement.status != "active":
        raise HTTPException(status_code=400, detail="Only active agreements can be cancelled")
    agreement.status = "cancelled"
    agreement.escrow_status = "refunded"
    await db.flush()
    return {"agreement_id": str(agreement.id), "status": "cancelled"}
