from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from database import get_db
from middleware.auth import get_current_user
from models.facility import Facility
from models.user import User
from schemas.facility import FacilityCreate, FacilityUpdate, FacilityResponse

router = APIRouter(prefix="/api/v1/facilities", tags=["Facilities"])


@router.post("/", response_model=FacilityResponse, status_code=201)
async def create_facility(
    data: FacilityCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Register a new facility (factory, warehouse, processing plant) for geolocation mapping."""
    facility = Facility(
        org_id=user.org_id,
        name=data.name,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        facility_type=data.facility_type,
        capacity_kg=data.capacity_kg,
    )
    db.add(facility)
    await db.flush()
    await db.refresh(facility)
    return facility


@router.get("/", response_model=list[FacilityResponse])
async def list_my_facilities(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all facilities belonging to my organization."""
    result = await db.execute(
        select(Facility)
        .where(Facility.org_id == user.org_id)
        .order_by(Facility.created_at.desc())
    )
    return result.scalars().all()


@router.get("/all", response_model=list[FacilityResponse])
async def list_all_facilities(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all active facilities across the platform (for map view)."""
    result = await db.execute(
        select(Facility).where(Facility.is_active == True).order_by(Facility.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{facility_id}", response_model=FacilityResponse)
async def get_facility(
    facility_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get facility details by ID."""
    facility = await db.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility


@router.patch("/{facility_id}", response_model=FacilityResponse)
async def update_facility(
    facility_id: UUID,
    data: FacilityUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a facility belonging to my organization."""
    facility = await db.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    if facility.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Not your facility")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(facility, field, value)
    await db.flush()
    await db.refresh(facility)
    return facility
