from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from database import get_db
from middleware.auth import get_current_user
from models.esg import ESGRecord, GreenCertificate
from models.agreement import Agreement
from models.material_listing import MaterialListing
from models.match import SymbiosisMatch
from models.user import User
from schemas.esg import DashboardResponse

router = APIRouter(prefix="/api/v1/dashboard", tags=["Executive Dashboard"])


@router.get("/{org_id}", response_model=DashboardResponse)
async def get_executive_dashboard(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Executive Impact Dashboard — macro analytics for Recharts visualization."""

    # Total CO2 saved
    co2_query = select(func.coalesce(func.sum(ESGRecord.value), 0)).where(
        ESGRecord.org_id == org_id,
        ESGRecord.record_type == "co2_offset",
    )
    total_co2 = (await db.execute(co2_query)).scalar() or 0

    # Total material reused
    reuse_query = select(func.coalesce(func.sum(ESGRecord.value), 0)).where(
        ESGRecord.org_id == org_id,
        ESGRecord.record_type == "material_reuse",
    )
    total_reused = (await db.execute(reuse_query)).scalar() or 0

    # Total listed volume for cost savings percentage
    total_listed = (await db.execute(
        select(func.coalesce(func.sum(MaterialListing.volume_kg), 0))
        .where(MaterialListing.org_id == org_id)
    )).scalar() or 0

    # Calculate cost savings and material reuse percentages
    cost_savings_pct = min(round(float(total_reused) / max(float(total_listed), 1) * 20, 1), 100.0)
    material_reuse_pct = min(round(float(total_reused) / max(float(total_listed), 1) * 100, 1), 100.0)

    # Monthly CO2 trend
    monthly_query = (
        select(
            func.date_trunc("month", ESGRecord.created_at).label("month"),
            func.sum(ESGRecord.value).label("total"),
        )
        .where(ESGRecord.org_id == org_id, ESGRecord.record_type == "co2_offset")
        .group_by(func.date_trunc("month", ESGRecord.created_at))
        .order_by(func.date_trunc("month", ESGRecord.created_at))
    )
    monthly_result = await db.execute(monthly_query)
    monthly_trend = [
        {"month": str(r.month), "co2_offset_kg": float(r.total)}
        for r in monthly_result
    ]

    # Certificates issued
    cert_count = (await db.execute(
        select(func.count()).select_from(GreenCertificate).where(GreenCertificate.org_id == org_id)
    )).scalar() or 0

    return DashboardResponse(
        total_co2_saved_kg=round(float(total_co2), 2),
        total_material_reused_kg=round(float(total_reused), 2),
        cost_savings_pct=cost_savings_pct,
        material_reuse_pct=material_reuse_pct,
        green_certificates_issued=cert_count,
        monthly_co2_trend=monthly_trend,
        net_zero_target_year=2060,
    )
