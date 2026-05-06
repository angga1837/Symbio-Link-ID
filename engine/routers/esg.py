from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from database import get_db
from middleware.auth import get_current_user
from models.esg import ESGRecord, GreenCertificate
from models.user import User
from schemas.esg import ESGRecordResponse, GreenCertificateResponse, Scope3LedgerResponse
from services.blockchain_service import fetch_regulatory_audit

router = APIRouter(prefix="/api/v1/esg", tags=["ESG Traceability"])


@router.get("/scope3/{org_id}", response_model=Scope3LedgerResponse)
async def get_scope3_ledger(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Scope 3 Emissions Ledger — auditable table of all CO2 offsets."""
    query = (
        select(ESGRecord)
        .where(ESGRecord.org_id == org_id)
        .where(ESGRecord.record_type.in_(["co2_offset", "scope3_emission"]))
        .order_by(ESGRecord.created_at.desc())
    )
    result = await db.execute(query)
    records = result.scalars().all()

    total_offset = sum(r.value for r in records if r.record_type == "co2_offset")
    return Scope3LedgerResponse(
        org_id=str(org_id),
        total_co2_offset_kg=round(total_offset, 2),
        record_count=len(records),
        records=records,
    )


@router.get("/certificates/{org_id}", response_model=list[GreenCertificateResponse])
async def list_certificates(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all Green Certificates issued to an organization."""
    result = await db.execute(
        select(GreenCertificate)
        .where(GreenCertificate.org_id == org_id)
        .order_by(GreenCertificate.issued_at.desc())
    )
    return result.scalars().all()


@router.get("/regulatory-audit")
async def regulatory_audit(user: User = Depends(get_current_user)):
    """Fetch full regulatory audit from blockchain gateway (regulator access)."""
    return await fetch_regulatory_audit()
