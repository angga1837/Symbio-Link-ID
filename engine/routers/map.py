"""
New map router — exposes geospatial data for the Symbiosis Visualizer.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from middleware.auth import get_current_user
from models.facility import Facility
from models.match import SymbiosisMatch
from models.user import User

router = APIRouter(prefix="/api/v1/map", tags=["Geospatial Map"])


@router.get("/facilities")
async def get_all_facilities_geodata(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return all active facilities with lat/lng for map rendering."""
    result = await db.execute(
        select(Facility).where(Facility.is_active == True)
    )
    facilities = result.scalars().all()
    return [
        {
            "id": str(f.id),
            "org_id": str(f.org_id),
            "name": f.name,
            "address": f.address,
            "latitude": f.latitude,
            "longitude": f.longitude,
            "facility_type": f.facility_type,
            "capacity_kg": f.capacity_kg,
            "is_my_facility": f.org_id == user.org_id,
        }
        for f in facilities
    ]


@router.get("/routes")
async def get_symbiosis_routes(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Return MILP-matched symbiosis routes as geodata pairs for map polylines.
    Each route is a sender→receiver line with volume and CO2 metadata.
    """
    # Fetch active matches involving any org (for full ecosystem view)
    result = await db.execute(
        select(SymbiosisMatch).where(
            SymbiosisMatch.status.in_(["proposed", "accepted", "negotiating", "contracted"])
        )
    )
    matches = result.scalars().all()

    routes = []
    for match in matches:
        sender_fac = await db.get(Facility, match.sender_facility)
        receiver_fac = await db.get(Facility, match.receiver_facility)
        if not sender_fac or not receiver_fac:
            continue
        routes.append({
            "match_id": str(match.id),
            "status": match.status,
            "is_my_route": (
                match.sender_org_id == user.org_id
                or match.receiver_org_id == user.org_id
            ),
            "sender": {
                "facility_id": str(sender_fac.id),
                "name": sender_fac.name,
                "latitude": sender_fac.latitude,
                "longitude": sender_fac.longitude,
            },
            "receiver": {
                "facility_id": str(receiver_fac.id),
                "name": receiver_fac.name,
                "latitude": receiver_fac.latitude,
                "longitude": receiver_fac.longitude,
            },
            "matched_volume_kg": match.matched_volume_kg,
            "co2_saved_kg": match.co2_saved_kg,
            "transport_distance_km": match.transport_distance_km,
            "transport_cost": match.transport_cost,
            "match_score": match.match_score,
        })

    return {
        "total_routes": len(routes),
        "routes": routes,
    }
