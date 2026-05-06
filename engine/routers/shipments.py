from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime, timezone
from database import get_db
from middleware.auth import get_current_user
from models.shipment import Shipment
from models.agreement import Agreement
from models.facility import Facility
from models.match import SymbiosisMatch
from models.user import User
from schemas.esg import ShipmentResponse, ShipmentStatusUpdate
from services.blockchain_service import commit_shipment_status
from services.matching_engine import haversine_km

router = APIRouter(prefix="/api/v1/shipments", tags=["Shipment Tracking"])


@router.post("/{agreement_id}/create", response_model=ShipmentResponse, status_code=201)
async def create_shipment(
    agreement_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a shipment for a contracted agreement."""
    agreement = await db.get(Agreement, agreement_id)
    if not agreement or agreement.status != "active":
        raise HTTPException(status_code=400, detail="Agreement must be active")

    # Get facilities from the match
    match = await db.get(SymbiosisMatch, agreement.match_id)
    sender_fac = await db.get(Facility, match.sender_facility)
    receiver_fac = await db.get(Facility, match.receiver_facility)

    distance = haversine_km(
        sender_fac.latitude, sender_fac.longitude,
        receiver_fac.latitude, receiver_fac.longitude,
    )

    initial_event = {
        "status": "scheduled",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tx_id": None,
    }

    shipment = Shipment(
        agreement_id=agreement_id,
        transporter_org=user.org_id,
        pickup_lat=sender_fac.latitude,
        pickup_lng=sender_fac.longitude,
        delivery_lat=receiver_fac.latitude,
        delivery_lng=receiver_fac.longitude,
        distance_km=round(distance, 2),
        status_history=[initial_event],
        blockchain_hashes=[],
    )
    db.add(shipment)
    await db.flush()
    await db.refresh(shipment)
    return shipment


@router.get("/my", response_model=list[ShipmentResponse])
async def my_shipments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all shipments where my org is the transporter, sender, or receiver."""
    # Get agreement IDs involving my org
    agreement_ids = select(Agreement.id).where(
        (Agreement.sender_org_id == user.org_id)
        | (Agreement.receiver_org_id == user.org_id)
    )
    query = (
        select(Shipment)
        .where(
            (Shipment.agreement_id.in_(agreement_ids))
            | (Shipment.transporter_org == user.org_id)
        )
        .order_by(Shipment.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    shipment = await db.get(Shipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment


@router.patch("/{shipment_id}/status", response_model=ShipmentResponse)
async def update_shipment_status(
    shipment_id: UUID,
    data: ShipmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Update shipment status with blockchain commit.
    Valid transitions: scheduled -> picked_up -> in_transit -> delivered -> processed -> verified
    """
    shipment = await db.get(Shipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    valid_transitions = {
        "scheduled": ["picked_up"],
        "picked_up": ["in_transit"],
        "in_transit": ["delivered"],
        "delivered": ["processed"],
        "processed": ["verified"],
    }
    allowed = valid_transitions.get(shipment.status, [])
    if data.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{shipment.status}' to '{data.status}'. Allowed: {allowed}",
        )

    # Commit status change to blockchain
    tx_hash = await commit_shipment_status(
        str(shipment_id), data.status, {"vehicle_id": data.vehicle_id, "notes": data.notes}
    )

    # Update status history
    history = shipment.status_history or []
    history.append({
        "status": data.status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tx_id": tx_hash,
    })
    shipment.status_history = history
    shipment.status = data.status

    hashes = shipment.blockchain_hashes or []
    hashes.append(tx_hash)
    shipment.blockchain_hashes = hashes

    if data.vehicle_id:
        shipment.vehicle_id = data.vehicle_id

    await db.flush()
    await db.refresh(shipment)
    return shipment
