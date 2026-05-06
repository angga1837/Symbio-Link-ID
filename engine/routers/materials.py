from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional
from database import get_db
from middleware.auth import get_current_user
from models.material_listing import MaterialListing
from models.facility import Facility
from models.user import User
from schemas.material import (
    MaterialListingCreate, MaterialListingResponse,
    MaterialListingUpdate, PurityCheckRequest, PurityCheckResponse,
)
from predictor import predict_quality_v2
from vision_predictor import predict_image
from config import get_settings
from services.bot_service import simulate_buyer_bots

router = APIRouter(prefix="/api/v1/materials", tags=["Material Passports"])
settings = get_settings()


@router.post("/purity-check", response_model=PurityCheckResponse)
async def check_purity(data: PurityCheckRequest, user: User = Depends(get_current_user)):
    """Real-time AI Trust Layer — called as user types material specs."""
    score = predict_quality_v2(
        data.ph_level,
        data.moisture_pct,
        data.volume_kg,
        data.carbon_pct,
        data.hydrogen_pct,
        data.ash_pct,
    )
    chemical_features_used = any(
        v is not None for v in [data.carbon_pct, data.hydrogen_pct, data.ash_pct]
    )
    requires_remediation = score < settings.ML_PURITY_THRESHOLD
    return PurityCheckResponse(
        ml_purity_score=score,
        meets_threshold=score >= settings.ML_PURITY_THRESHOLD,
        requires_remediation=requires_remediation,
        threshold=settings.ML_PURITY_THRESHOLD,
        ceiling=settings.ML_PURITY_CEILING,
        recommendation=(
            "Material flagged for remediation — purity below 60% threshold"
            if requires_remediation
            else "Material qualifies for exchange"
        ),
        chemical_features_used=chemical_features_used,
    )


@router.post("/classify-image")
async def classify_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Classify waste material from an uploaded image using vision model."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    image_bytes = await file.read()
    predicted = predict_image(image_bytes)
    
    if predicted in ["Gagal Identifikasi", "Model Tidak Tersedia", "Gambar Tidak Dikenali"]:
        raise HTTPException(
            status_code=400,
            detail="Gambar bukan material yang terdaftar AI sistem atau terdapat lebih dari 1 material. Silahkan foto satu persatu atau mengambil gambar lain"
        )
        
    return {"predicted_material": predicted}


@router.post("/", response_model=MaterialListingResponse, status_code=201)
async def create_listing(
    data: MaterialListingCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new Digital Material Passport."""
    facility = await db.get(Facility, data.facility_id)
    if not facility or facility.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Facility not owned by your organization")

    # Run AI Trust Layer v2 with all chemical features
    ml_score = predict_quality_v2(
        data.ph_level or 7.0,
        data.moisture_pct or 10.0,
        data.volume_kg,
        data.carbon_pct,
        data.hydrogen_pct,
        data.ash_pct,
    )

    listing = MaterialListing(
        org_id=user.org_id,
        facility_id=data.facility_id,
        material_type=data.material_type,
        description=data.description,
        volume_kg=data.volume_kg,
        supply_mode=data.supply_mode,
        frequency_days=data.frequency_days,
        ph_level=data.ph_level,
        moisture_pct=data.moisture_pct,
        toxicity_class=data.toxicity_class,
        chemical_composition=data.chemical_composition,
        carbon_pct=data.carbon_pct,
        hydrogen_pct=data.hydrogen_pct,
        ash_pct=data.ash_pct,
        ml_purity_score=ml_score,
        ml_model_version="v2.0-enhanced-chemical",
        requires_remediation=ml_score < settings.ML_PURITY_THRESHOLD,
        status="listed" if ml_score >= settings.ML_PURITY_THRESHOLD else "draft",
        image_urls=data.image_urls or [],
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    
    # Automatically spawn buyer bots to interact with this new listing
    if listing.status == "listed":
        background_tasks.add_task(simulate_buyer_bots, listing.id)
        
    return listing


@router.get("/", response_model=list[MaterialListingResponse])
async def list_materials(
    status: Optional[str] = Query(None),
    material_type: Optional[str] = Query(None),
    min_volume: Optional[float] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Browse the material marketplace catalog."""
    query = select(MaterialListing).where(MaterialListing.status != "draft")
    if status:
        query = query.where(MaterialListing.status == status)
    if material_type:
        query = query.where(MaterialListing.material_type.ilike(f"%{material_type}%"))
    if min_volume:
        query = query.where(MaterialListing.volume_kg >= min_volume)
    query = query.order_by(MaterialListing.listed_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/my", response_model=list[MaterialListingResponse])
async def my_listings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List materials owned by my organization."""
    result = await db.execute(
        select(MaterialListing)
        .where(MaterialListing.org_id == user.org_id)
        .order_by(MaterialListing.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{listing_id}", response_model=MaterialListingResponse)
async def get_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a single material listing by ID."""
    listing = await db.get(MaterialListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.patch("/{listing_id}", response_model=MaterialListingResponse)
async def update_listing(
    listing_id: UUID,
    data: MaterialListingUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a material listing owned by my organization."""
    listing = await db.get(MaterialListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Not your listing")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)
    await db.flush()
    await db.refresh(listing)
    return listing
