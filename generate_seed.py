import sys

code = '''import asyncio
import uuid
import random
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from sqlalchemy import select, func, text
from database import async_session, engine, Base
from models.organization import Organization
from models.user import User
from models.facility import Facility
from models.material_listing import MaterialListing
from models.match import SymbiosisMatch
from models.negotiation import Negotiation, NegotiationMessage
from models.agreement import Agreement
from models.shipment import Shipment
from models.esg import ComplianceDocument, GreenCertificate
from services.matching_engine import run_matching
from services.blockchain_service import commit_to_ledger, commit_shipment_status

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_database():
    print("Dropping all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Tables dropped and recreated.")

async def _get_or_create(db, model, defaults=None, **filters):
    result = await db.execute(select(model).filter_by(**filters))
    instance = result.scalar_one_or_none()
    if instance: return instance
    instance = model(**{**filters, **(defaults or {})})
    db.add(instance)
    await db.flush()
    return instance

async def _ensure_matches(db, listing: MaterialListing) -> list[SymbiosisMatch]:
    result = await db.execute(select(SymbiosisMatch).where(SymbiosisMatch.listing_id == listing.id))
    matches = result.scalars().all()
    if matches: return matches
    return await run_matching(str(listing.id), db)

async def _build_status_history(shipment_id: str, statuses: list[str], start: datetime):
    history, hashes, current = [], [], start
    for status in statuses:
        tx_hash = await commit_shipment_status(shipment_id, status, {"seed": True})
        history.append({"status": status, "timestamp": current.isoformat(), "tx_id": tx_hash})
        hashes.append(tx_hash)
        current += timedelta(hours=6)
    return history, hashes

async def seed_data():
    await reset_database()
    async with async_session() as db:
        print("Seeding diverse mock data...")
        
        # 1. Organizations
        org_gen = await _get_or_create(db, Organization, tax_id="01.234.567.8-000.000", defaults={"name": "PT Jawa Steel Industries", "org_type": "maker", "verified": True, "kyc_status": "verified"})
        org_con1 = await _get_or_create(db, Organization, tax_id="02.345.678.9-000.000", defaults={"name": "PT Semen Nusantara", "org_type": "recycler", "verified": True, "kyc_status": "verified"})
        org_con2 = await _get_or_create(db, Organization, tax_id="03.456.789.0-000.000", defaults={"name": "PT EcoBricks Indonesia", "org_type": "recycler", "verified": True, "kyc_status": "verified"})
        org_log = await _get_or_create(db, Organization, tax_id="04.567.890.1-000.000", defaults={"name": "PT Nusantara Logistics", "org_type": "transporter", "verified": True, "kyc_status": "verified"})
        org_reg = await _get_or_create(db, Organization, tax_id="05.678.901.2-000.000", defaults={"name": "Kementerian Lingkungan", "org_type": "regulator", "verified": True, "kyc_status": "verified"})

        orgs_map = {"jawa": org_gen, "semen": org_con1, "eco": org_con2}

        # 2. Users
        users_map = {}
        for key, org, email, fname in [
            ("jawa", org_gen, "admin@jawasteel.com", "Jawa Steel Admin"),
            ("semen", org_con1, "admin@semennusantara.com", "Semen Nusantara Admin"),
            ("eco", org_con2, "admin@ecobricks.com", "EcoBricks Admin"),
        ]:
            users_map[key] = await _get_or_create(db, User, email=email, defaults={"org_id": org.id, "password_hash": pwd_context.hash("symbio2026"), "full_name": fname, "role": "owner", "is_active": True})

        # Logistics and Regulator
        await _get_or_create(db, User, email="ops@nusantaralogistics.com", defaults={"org_id": org_log.id, "password_hash": pwd_context.hash("symbio2026"), "full_name": "Nusantara Logistics Ops", "role": "owner", "is_active": True})
        await _get_or_create(db, User, email="auditor@kementerian.go.id", defaults={"org_id": org_reg.id, "password_hash": pwd_context.hash("symbio2026"), "full_name": "Environmental Auditor", "role": "owner", "is_active": True})

        # 3. Facilities
        facs_map = {}
        facs_map["jawa_1"] = await _get_or_create(db, Facility, org_id=org_gen.id, name="Surabaya Steel Plant", defaults={"address": "Kawasan Industri Rungkut", "latitude": -7.3323, "longitude": 112.7618, "facility_type": "factory", "capacity_kg": 500000.0, "is_active": True})
        facs_map["jawa_2"] = await _get_or_create(db, Facility, org_id=org_gen.id, name="Sidoarjo Foundry", defaults={"address": "Jl. Industri Modern", "latitude": -7.4523, "longitude": 112.7410, "facility_type": "factory", "capacity_kg": 200000.0, "is_active": True})
        facs_map["semen_1"] = await _get_or_create(db, Facility, org_id=org_con1.id, name="Gresik Cement Factory", defaults={"address": "Jl. Veteran, Gresik", "latitude": -7.1683, "longitude": 112.6465, "facility_type": "processing_plant", "capacity_kg": 1000000.0, "is_active": True})
        facs_map["semen_2"] = await _get_or_create(db, Facility, org_id=org_con1.id, name="Tuban Kiln Center", defaults={"address": "Tuban Industrial", "latitude": -6.8950, "longitude": 111.8310, "facility_type": "processing_plant", "capacity_kg": 800000.0, "is_active": True})
        facs_map["eco_1"] = await _get_or_create(db, Facility, org_id=org_con2.id, name="Mojokerto Eco Plant", defaults={"address": "Ngoro Industrial Park", "latitude": -7.5683, "longitude": 112.6065, "facility_type": "processing_plant", "capacity_kg": 80000.0, "is_active": True})
        facs_map["eco_2"] = await _get_or_create(db, Facility, org_id=org_con2.id, name="Pasuruan Recycling Hub", defaults={"address": "PIER Pasuruan", "latitude": -7.5878, "longitude": 112.8091, "facility_type": "processing_plant", "capacity_kg": 50000.0, "is_active": True})

        # 4. Compliance Documents for ALL Orgs
        for key, org in orgs_map.items():
            await _get_or_create(db, ComplianceDocument, org_id=org.id, doc_type="iso_14001", defaults={
                "file_url": f"https://storage.symbio-link.id/docs/iso14001-{key}.pdf", "file_hash": f"mockhash-{key}",
                "issued_date": datetime(2023, 1, 15).date(), "expiry_date": datetime(2026, 1, 15).date(), "status": "approved", "reviewed_by": users_map[key].id})

        # 5. Distinct Listings
        def draft_listing(org_key, fac_key, mat_type, desc, vol, status, ph, moist, tox, purity=0.9, carbon=0, ash=0):
            return MaterialListing(
                org_id=orgs_map[org_key].id, facility_id=facs_map[fac_key].id, material_type=mat_type, description=desc,
                volume_kg=vol, supply_mode="batch" if vol < 20000 else "continuous", status=status,
                ph_level=ph, moisture_pct=moist, toxicity_class=tox, carbon_pct=carbon, ash_pct=ash, hydrogen_pct=0.1,
                ml_purity_score=purity, ml_model_version="symbio_v3.0", requires_remediation=False if tox == "non_toxic" else True
            )

        listings = [
            # Jawa Steel Listings
            draft_listing("jawa", "jawa_1", "Steel Slag", "High iron content slag from blast furnace", 200000.0, "in_transit", 10.5, 2.1, "non_toxic", 0.94, 2.0, 45.0),
            draft_listing("jawa", "jawa_1", "Fly Ash", "Coal combustion byproduct.", 120000.0, "listed", 8.0, 1.2, "non_toxic", 0.91, 3.5, 80.0),
            draft_listing("jawa", "jawa_2", "Copper Sludge", "Sludge from cooling towers.", 45000.0, "processed", 6.8, 15.0, "moderate", 0.85, 12.0, 20.0),
            draft_listing("jawa", "jawa_2", "Scrap Metal Shavings", "Loose metal cuttings.", 15000.0, "listed", 7.0, 0.5, "non_toxic", 0.99, 1.0, 5.0),
            # Semen Nusantara Listings
            draft_listing("semen", "semen_1", "Cement Kiln Dust", "Fine particulate matter from exhaust.", 85000.0, "matched", 11.0, 3.0, "moderate", 0.88, 1.5, 95.0),
            draft_listing("semen", "semen_2", "Off-spec Cement Blend", "Rejected batch due to setting time.", 42000.0, "listed", 12.0, 5.0, "non_toxic", 0.96, 0.5, 90.0),
            draft_listing("semen", "semen_1", "Used Filter Bags", "Particulate filters, low toxicity.", 5000.0, "draft", 7.0, 12.0, "moderate", 0.60, 45.0, 15.0),
            # EcoBricks Listings
            draft_listing("eco", "eco_1", "Plastic Extrusion Trimmings", "Clean LDPE trimmings.", 25000.0, "in_transit", 7.0, 0.2, "non_toxic", 0.98, 85.0, 0.5),
            draft_listing("eco", "eco_2", "Crushed Brick Reject", "Broken ecobricks during QA.", 50000.0, "processed", 8.0, 5.0, "non_toxic", 0.92, 10.0, 60.0),
            draft_listing("eco", "eco_1", "Wash Water Residue", "Settled solids from washing.", 12000.0, "listed", 6.5, 45.0, "moderate", 0.50, 15.0, 20.0),
        ]
        db.add_all(listings)
        await db.flush()

        # 6. Matches & Inter-Organization Trading
        # Force matches to happen for all non-draft listings to ensure everyone has both "sent" and "received" datasets
        for l in listings:
            if l.status in ["matched", "in_transit", "processed"]:
                matches = await _ensure_matches(db, l)
                if not matches:
                    continue
                # Pick the first match
                m = matches[0]
                m.status = {"matched": "proposed", "in_transit": "contracted", "processed": "contracted"}[l.status]
                
                # Create Negotiation
                neg = Negotiation(match_id=m.id, initiated_by=m.receiver_org_id, proposed_price_per_kg=random.uniform(0.05, 0.25), payment_terms="net_30", notes="Automated Agreement", status="accepted")
                db.add(neg)
                await db.flush()
                
                # Messages
                db.add(NegotiationMessage(negotiation_id=neg.id, sender_org_id=m.sender_org_id, sender_user_id=users_map[list(orgs_map.keys())[list(orgs_map.values()).index(org_gen) if m.sender_org_id == org_gen.id else list(orgs_map.values()).index(org_con1) if m.sender_org_id == org_con1.id else list(orgs_map.values()).index(org_con2)]].id, message="Standard volume accepted."))

                # Create Agreement
                tx_hash = f"0x{uuid.uuid4().hex}"
                agr = Agreement(negotiation_id=neg.id, match_id=m.id, sender_org_id=m.sender_org_id, receiver_org_id=m.receiver_org_id, agreed_price_per_kg=neg.proposed_price_per_kg, agreed_volume_kg=m.matched_volume_kg, pickup_date=datetime.now(timezone.utc)+timedelta(days=2), delivery_date=datetime.now(timezone.utc)+timedelta(days=5), payment_terms="net_30", escrow_status="funded" if l.status == "in_transit" else "released", blockchain_tx_hash=tx_hash, status="active" if l.status == "in_transit" else "fulfilled")
                db.add(agr)
                await db.flush()

                # Create Shipment
                if l.status in ["in_transit", "processed"]:
                    dist = m.transport_distance_km
                    ship = Shipment(agreement_id=agr.id, transporter_org=org_log.id, pickup_lat=-7.0, pickup_lng=112.0, delivery_lat=-7.5, delivery_lng=112.5, distance_km=dist, status="in_transit" if l.status == "in_transit" else "verified", status_history=[], blockchain_hashes=[], vehicle_id=f"TRK-{random.randint(100,999)}")
                    db.add(ship)
                    await db.flush()
                    history, hashes = await _build_status_history(str(ship.id), ["scheduled", "picked_up", "in_transit"] if l.status == "in_transit" else ["scheduled", "picked_up", "in_transit", "delivered", "processed", "verified"], datetime.now(timezone.utc) - timedelta(days=2))
                    ship.status_history = history
                    ship.blockchain_hashes = hashes

        await db.commit()
        print("Database distinct seeded successfully! Entities are cross-interacting natively.")

if __name__ == "__main__":
    asyncio.run(seed_data())
'''

with open('engine/seed_mock.py', 'w', encoding='utf-8') as f:
    f.write(code)

