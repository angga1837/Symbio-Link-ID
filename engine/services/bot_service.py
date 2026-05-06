import asyncio
import random
import uuid
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.match import SymbiosisMatch
from models.negotiation import Negotiation, NegotiationMessage
from models.agreement import Agreement
from models.shipment import Shipment
from models.facility import Facility
from models.organization import Organization
from services.matching_engine import run_matching
from database import async_session

logger = logging.getLogger(__name__)

async def simulate_buyer_bots(listing_id: uuid.UUID):
    await asyncio.sleep(5) # Let the listing save fully and UI update
    async with async_session() as db:
        try:
            from models.material_listing import MaterialListing
            from models.user import User
            
            listing = await db.get(MaterialListing, listing_id)
            if not listing:
                return
            
            # Fetch official matches
            matches = await run_matching(str(listing.id), db)
            
            # Augment with fake matches if not enough
            if not matches or len(matches) < 4:
                result = await db.execute(select(Facility).where(Facility.org_id != listing.org_id).limit(10))
                other_facilities = result.scalars().all()
                    
                matches_to_add = []
                for fac in other_facilities:
                    if any(m.receiver_facility == fac.id for m in matches):
                        continue
                        
                    dist = random.uniform(10.0, 500.0)
                    match = SymbiosisMatch(
                        listing_id=listing.id,
                        sender_org_id=listing.org_id,
                        receiver_org_id=fac.org_id,
                        sender_facility=listing.facility_id,
                        receiver_facility=fac.id,
                        matched_volume_kg=listing.volume_kg * random.uniform(0.1, 1.0),
                        transport_cost=dist * 0.002,
                        transport_distance_km=dist,
                        status="proposed",
                        co2_saved_kg=listing.volume_kg * random.uniform(0.4, 0.9),
                        match_score=random.uniform(70.0, 99.0)
                    )
                    db.add(match)
                    matches_to_add.append(match)
                await db.commit()
                # need to refresh to get IDs
                for m in matches_to_add:
                    await db.refresh(m)
                matches.extend(matches_to_add)

            # Simulate negotiations
            for i, match in enumerate(matches):
                if random.random() > 0.9 and i > 1: continue 
                price = random.uniform(0.05, 0.40)
                
                # The first bot creates an immediate "accepted" to demonstrate agreements and shipping
                status = "accepted" if i == 0 else random.choice(["open", "open", "counter_offered"])
                payment_term = random.choice(["prepaid", "net_30", "net_15", "escrow"])
                
                neg = Negotiation(
                    match_id=match.id,
                    initiated_by=match.receiver_org_id,
                    status=status,
                    proposed_price_per_kg=price,
                    proposed_pickup_date=datetime.now(timezone.utc) + timedelta(days=random.randint(1,5)),
                    proposed_delivery_date=datetime.now(timezone.utc) + timedelta(days=random.randint(6,10)),
                    payment_terms=payment_term
                )
                db.add(neg)
                await db.flush()
                
                user_res = await db.execute(select(User).where(User.org_id == match.receiver_org_id).limit(1))
                buyer_user = user_res.scalar_one_or_none()
                fake_sender_uuid = buyer_user.id if buyer_user else uuid.uuid4()
                
                msg1 = NegotiationMessage(
                    negotiation_id=neg.id,
                    sender_org_id=match.receiver_org_id,
                    sender_user_id=fake_sender_uuid,
                    message=f"Hi, we are very interested in reusing your {listing.material_type}. Is ${price:.2f}/kg acceptable under {payment_term.replace('_', ' ')} terms? We have processing capacity ready."
                )
                db.add(msg1)
                
                if status == "accepted":
                    match.status = "contracted"
                    agrmnt = Agreement(
                        negotiation_id=neg.id,
                        buyer_org_id=match.receiver_org_id,
                        seller_org_id=match.sender_org_id,
                        agreed_price_per_kg=price,
                        agreed_volume_kg=match.matched_volume_kg,
                        payment_terms=payment_term,
                        escrow_status="locked" if payment_term == "escrow" else None,
                        status="active"
                    )
                    db.add(agrmnt)
                    await db.flush()
                    
                    # Also create a shipment
                    shipment = Shipment(
                        agreement_id=agrmnt.id,
                        transporter_org_id=match.receiver_org_id,
                        origin_facility_id=match.sender_facility,
                        destination_facility_id=match.receiver_facility,
                        status="in_transit",
                        current_lat=-6.175,
                        current_lon=106.827,
                        estimated_arrival=datetime.now(timezone.utc) + timedelta(days=2)
                    )
                    db.add(shipment)

            await db.commit()
            logger.info(f"Bot transactions injected for listing {listing_id}")
        except Exception as e:
            logger.error(f"Failed to inject bot interactions: {e}")
            await db.rollback()
