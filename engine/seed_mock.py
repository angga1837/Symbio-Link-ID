import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from sqlalchemy import select, func
from database import async_session
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
from services.certificate_service import issue_green_certificate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def _get_or_create(db, model, defaults=None, **filters):
    result = await db.execute(select(model).filter_by(**filters))
    instance = result.scalar_one_or_none()
    if instance:
        return instance
    params = {**filters, **(defaults or {})}
    instance = model(**params)
    db.add(instance)
    await db.flush()
    return instance


async def _ensure_matches(db, listing: MaterialListing) -> list[SymbiosisMatch]:
    result = await db.execute(
        select(SymbiosisMatch).where(SymbiosisMatch.listing_id == listing.id)
    )
    matches = result.scalars().all()
    if matches:
        return matches
    return await run_matching(str(listing.id), db)


async def _build_status_history(shipment_id: str, statuses: list[str], start: datetime) -> tuple[list[dict], list[str]]:
    history = []
    hashes = []
    current = start
    for status in statuses:
        tx_hash = await commit_shipment_status(shipment_id, status, {"seed": True})
        history.append({
            "status": status,
            "timestamp": current.isoformat(),
            "tx_id": tx_hash,
        })
        hashes.append(tx_hash)
        current += timedelta(hours=6)
    return history, hashes


async def seed_data(force: bool = False):
    async with async_session() as db:
        print("Starting database seed...")

        existing_orgs = (await db.execute(
            select(func.count()).select_from(Organization)
        )).scalar() or 0
        if existing_orgs > 0 and not force:
            print("Seed mode: enriching existing data.")

        # --- Organizations ---
        org_gen = await _get_or_create(
            db,
            Organization,
            tax_id="01.234.567.8-000.000",
            defaults={
                "name": "PT Jawa Steel Industries",
                "org_type": "maker",
                "verified": True,
                "kyc_status": "verified",
            },
        )
        org_con1 = await _get_or_create(
            db,
            Organization,
            tax_id="02.345.678.9-000.000",
            defaults={
                "name": "PT Semen Nusantara",
                "org_type": "recycler",
                "verified": True,
                "kyc_status": "verified",
            },
        )
        org_con2 = await _get_or_create(
            db,
            Organization,
            tax_id="03.456.789.0-000.000",
            defaults={
                "name": "PT EcoBricks Indonesia",
                "org_type": "recycler",
                "verified": True,
                "kyc_status": "verified",
            },
        )
        org_log = await _get_or_create(
            db,
            Organization,
            tax_id="04.567.890.1-000.000",
            defaults={
                "name": "PT Nusantara Logistics",
                "org_type": "transporter",
                "verified": True,
                "kyc_status": "verified",
            },
        )
        org_reg = await _get_or_create(
            db,
            Organization,
            tax_id="05.678.901.2-000.000",
            defaults={
                "name": "Kementerian Lingkungan",
                "org_type": "regulator",
                "verified": True,
                "kyc_status": "verified",
            },
        )

        # --- Users ---
        user_gen = await _get_or_create(
            db,
            User,
            email="admin@jawasteel.com",
            defaults={
                "org_id": org_gen.id,
                "password_hash": pwd_context.hash("symbio2026"),
                "full_name": "Jawa Steel Admin",
                "role": "owner",
                "is_active": True,
            },
        )
        user_con1 = await _get_or_create(
            db,
            User,
            email="admin@semennusantara.com",
            defaults={
                "org_id": org_con1.id,
                "password_hash": pwd_context.hash("symbio2026"),
                "full_name": "Semen Nusantara Admin",
                "role": "owner",
                "is_active": True,
            },
        )
        user_con2 = await _get_or_create(
            db,
            User,
            email="admin@ecobricks.com",
            defaults={
                "org_id": org_con2.id,
                "password_hash": pwd_context.hash("symbio2026"),
                "full_name": "EcoBricks Admin",
                "role": "owner",
                "is_active": True,
            },
        )
        await _get_or_create(
            db,
            User,
            email="ops@nusantaralogistics.com",
            defaults={
                "org_id": org_log.id,
                "password_hash": pwd_context.hash("symbio2026"),
                "full_name": "Nusantara Logistics Ops",
                "role": "owner",
                "is_active": True,
            },
        )
        await _get_or_create(
            db,
            User,
            email="auditor@kementerian.go.id",
            defaults={
                "org_id": org_reg.id,
                "password_hash": pwd_context.hash("symbio2026"),
                "full_name": "Environmental Auditor",
                "role": "owner",
                "is_active": True,
            },
        )

        user_by_org = {
            org_gen.id: user_gen,
            org_con1.id: user_con1,
            org_con2.id: user_con2,
        }

        # --- Facilities ---
        fac_gen = await _get_or_create(
            db,
            Facility,
            org_id=org_gen.id,
            name="Surabaya Steel Plant",
            defaults={
                "address": "Kawasan Industri Rungkut, Surabaya",
                "latitude": -7.3323,
                "longitude": 112.7618,
                "facility_type": "factory",
                "capacity_kg": 500000.0,
                "is_active": True,
            },
        )
        fac_con1 = await _get_or_create(
            db,
            Facility,
            org_id=org_con1.id,
            name="Gresik Cement Factory",
            defaults={
                "address": "Jl. Veteran, Gresik",
                "latitude": -7.1683,
                "longitude": 112.6465,
                "facility_type": "processing_plant",
                "capacity_kg": 1000000.0,
                "is_active": True,
            },
        )
        fac_con1_b = await _get_or_create(
            db,
            Facility,
            org_id=org_con1.id,
            name="Sidoarjo Cement Plant",
            defaults={
                "address": "Kawasan Industri Sidoarjo",
                "latitude": -7.4478,
                "longitude": 112.7183,
                "facility_type": "processing_plant",
                "capacity_kg": 600000.0,
                "is_active": True,
            },
        )
        fac_con2 = await _get_or_create(
            db,
            Facility,
            org_id=org_con2.id,
            name="Mojokerto Eco Plant",
            defaults={
                "address": "Ngoro Industrial Park, Mojokerto",
                "latitude": -7.5683,
                "longitude": 112.6065,
                "facility_type": "processing_plant",
                "capacity_kg": 80000.0,
                "is_active": True,
            },
        )
        await _get_or_create(
            db,
            Facility,
            org_id=org_log.id,
            name="Surabaya Logistics Hub",
            defaults={
                "address": "Pelabuhan Tanjung Perak",
                "latitude": -7.2049,
                "longitude": 112.7309,
                "facility_type": "warehouse",
                "capacity_kg": 200000.0,
                "is_active": True,
            },
        )

        # --- Compliance Docs ---
        await _get_or_create(
            db,
            ComplianceDocument,
            org_id=org_gen.id,
            doc_type="iso_14001",
            defaults={
                "file_url": "https://storage.symbio-link.id/docs/iso14001-jawasteel.pdf",
                "file_hash": "seed-iso14001-jawa",
                "issued_date": datetime(2024, 6, 1).date(),
                "expiry_date": datetime(2027, 6, 1).date(),
                "status": "approved",
                "reviewed_by": user_gen.id,
            },
        )

        # --- Material Listings ---
        listing_ready = await _get_or_create(
            db,
            MaterialListing,
            org_id=org_gen.id,
            facility_id=fac_gen.id,
            material_type="Fly Ash",
            defaults={
                "description": "Fine fly ash suitable for cement blending.",
                "volume_kg": 80000.0,
                "supply_mode": "continuous",
                "status": "listed",
                "ph_level": 8.2,
                "moisture_pct": 4.8,
                "toxicity_class": "non_toxic",
                "carbon_pct": 0.8,
                "hydrogen_pct": 0.1,
                "ash_pct": 35.0,
                "ml_purity_score": 0.95,
                "ml_model_version": "symbio_v2.0",
                "requires_remediation": False,
                "image_urls": [],
            },
        )
        listing_matched = await _get_or_create(
            db,
            MaterialListing,
            org_id=org_gen.id,
            facility_id=fac_gen.id,
            material_type="Silica Fume",
            defaults={
                "description": "High-grade silica fume for concrete strength.",
                "volume_kg": 55000.0,
                "supply_mode": "batch",
                "status": "matched",
                "ph_level": 7.5,
                "moisture_pct": 3.2,
                "toxicity_class": "non_toxic",
                "carbon_pct": 0.4,
                "hydrogen_pct": 0.1,
                "ash_pct": 10.0,
                "ml_purity_score": 0.93,
                "ml_model_version": "symbio_v2.0",
                "requires_remediation": False,
                "image_urls": [],
            },
        )
        listing_transit = await _get_or_create(
            db,
            MaterialListing,
            org_id=org_gen.id,
            facility_id=fac_gen.id,
            material_type="Steel Slag",
            defaults={
                "description": "Steel slag ready for cement kiln input.",
                "volume_kg": 150000.0,
                "supply_mode": "continuous",
                "status": "in_transit",
                "ph_level": 11.2,
                "moisture_pct": 2.8,
                "toxicity_class": "non_toxic",
                "carbon_pct": 0.6,
                "hydrogen_pct": 0.1,
                "ash_pct": 40.0,
                "ml_purity_score": 0.92,
                "ml_model_version": "symbio_v2.0",
                "requires_remediation": False,
                "image_urls": [],
            },
        )
        listing_processed = await _get_or_create(
            db,
            MaterialListing,
            org_id=org_gen.id,
            facility_id=fac_gen.id,
            material_type="Copper Sludge",
            defaults={
                "description": "Copper sludge pending recovery; processed batch completed.",
                "volume_kg": 62000.0,
                "supply_mode": "batch",
                "status": "processed",
                "ph_level": 6.8,
                "moisture_pct": 12.0,
                "toxicity_class": "moderate",
                "carbon_pct": 12.0,
                "hydrogen_pct": 1.2,
                "ash_pct": 18.0,
                "ml_purity_score": 0.88,
                "ml_model_version": "symbio_v2.0",
                "requires_remediation": False,
                "image_urls": [],
            },
        )
        listing_draft = await _get_or_create(
            db,
            MaterialListing,
            org_id=org_gen.id,
            facility_id=fac_gen.id,
            material_type="Mixed Hazardous Residue",
            defaults={
                "description": "High-toxicity residue requiring remediation.",
                "volume_kg": 12000.0,
                "supply_mode": "batch",
                "status": "draft",
                "ph_level": 3.5,
                "moisture_pct": 25.0,
                "toxicity_class": "hazardous",
                "ml_purity_score": 0.42,
                "ml_model_version": "symbio_v2.0",
                "requires_remediation": True,
                "image_urls": [],
            },
        )

        # --- Matching ---
        matches_matched = await _ensure_matches(db, listing_matched)
        for m in matches_matched:
            m.status = "proposed"

        matches_transit = await _ensure_matches(db, listing_transit)
        matches_processed = await _ensure_matches(db, listing_processed)

        match_active = matches_transit[0] if len(matches_transit) > 0 else None
        match_fulfilled = matches_processed[0] if len(matches_processed) > 0 else None
        match_neg = matches_transit[1] if len(matches_transit) > 1 else None

        if match_active:
            match_active.status = "contracted"
        if match_fulfilled:
            match_fulfilled.status = "contracted"
        if match_neg:
            match_neg.status = "accepted"

        # --- Negotiation (open) ---
        if match_neg:
            neg = await _get_or_create(
                db,
                Negotiation,
                match_id=match_neg.id,
                defaults={
                    "initiated_by": match_neg.receiver_org_id,
                    "proposed_price_per_kg": 0.11,
                    "payment_terms": "net_30",
                    "notes": "Open to pickup window discussion.",
                    "status": "open",
                },
            )
            msg_count = (await db.execute(
                select(func.count()).select_from(NegotiationMessage)
                .where(NegotiationMessage.negotiation_id == neg.id)
            )).scalar() or 0
            if msg_count == 0:
                sender_user = user_by_org.get(match_neg.sender_org_id, user_gen)
                receiver_user = user_by_org.get(match_neg.receiver_org_id, user_con1)
                db.add(NegotiationMessage(
                    negotiation_id=neg.id,
                    sender_org_id=match_neg.sender_org_id,
                    sender_user_id=sender_user.id,
                    message="We can deliver 60% volume within 7 days."
                ))
                db.add(NegotiationMessage(
                    negotiation_id=neg.id,
                    sender_org_id=match_neg.receiver_org_id,
                    sender_user_id=receiver_user.id,
                    message="Confirming pickup window; propose 0.10 USD/kg."
                ))

        # --- Agreements ---
        async def create_agreement(match: SymbiosisMatch, status: str, escrow_status: str) -> Agreement | None:
            if not match:
                return None
            existing = await db.execute(
                select(Agreement).where(Agreement.match_id == match.id)
            )
            agreement = existing.scalar_one_or_none()
            if agreement:
                return agreement

            negotiation = await _get_or_create(
                db,
                Negotiation,
                match_id=match.id,
                defaults={
                    "initiated_by": match.sender_org_id,
                    "proposed_price_per_kg": 0.12,
                    "payment_terms": "escrow",
                    "notes": "Seeded agreement for demo flow.",
                    "status": "accepted",
                },
            )

            tx_hash = await commit_to_ledger({
                "type": "AGREEMENT_SIGNED",
                "match_id": str(match.id),
                "sender_org": str(match.sender_org_id),
                "receiver_org": str(match.receiver_org_id),
                "volume_kg": match.matched_volume_kg,
                "price_per_kg": negotiation.proposed_price_per_kg,
                "payment_terms": negotiation.payment_terms,
            })

            agreement = Agreement(
                negotiation_id=negotiation.id,
                match_id=match.id,
                sender_org_id=match.sender_org_id,
                receiver_org_id=match.receiver_org_id,
                agreed_price_per_kg=negotiation.proposed_price_per_kg or 0.1,
                agreed_volume_kg=match.matched_volume_kg,
                pickup_date=datetime.now(timezone.utc) + timedelta(days=2),
                delivery_date=datetime.now(timezone.utc) + timedelta(days=5),
                payment_terms=negotiation.payment_terms,
                escrow_status=escrow_status,
                blockchain_tx_hash=tx_hash,
                status=status,
            )
            db.add(agreement)
            await db.flush()
            return agreement

        agreement_active = await create_agreement(match_active, "active", "funded")
        agreement_fulfilled = await create_agreement(match_fulfilled, "fulfilled", "released")

        # --- Shipments ---
        async def ensure_shipment(agreement: Agreement | None, match: SymbiosisMatch | None, status_sequence: list[str], vehicle_id: str):
            if not agreement or not match:
                return
            existing = await db.execute(
                select(Shipment).where(Shipment.agreement_id == agreement.id)
            )
            shipment = existing.scalar_one_or_none()
            if shipment:
                return

            sender_fac = await db.get(Facility, match.sender_facility)
            receiver_fac = await db.get(Facility, match.receiver_facility)
            shipment = Shipment(
                agreement_id=agreement.id,
                transporter_org=org_log.id,
                pickup_lat=sender_fac.latitude if sender_fac else None,
                pickup_lng=sender_fac.longitude if sender_fac else None,
                delivery_lat=receiver_fac.latitude if receiver_fac else None,
                delivery_lng=receiver_fac.longitude if receiver_fac else None,
                distance_km=match.transport_distance_km,
                status=status_sequence[0],
                status_history=[],
                blockchain_hashes=[],
                vehicle_id=vehicle_id,
            )
            db.add(shipment)
            await db.flush()

            history, hashes = await _build_status_history(
                str(shipment.id),
                status_sequence,
                datetime.now(timezone.utc) - timedelta(days=2),
            )
            shipment.status_history = history
            shipment.blockchain_hashes = hashes
            shipment.status = status_sequence[-1]

        await ensure_shipment(agreement_active, match_active, ["scheduled", "picked_up", "in_transit"], "TRK-102")
        await ensure_shipment(agreement_fulfilled, match_fulfilled, ["scheduled", "picked_up", "in_transit", "delivered", "processed", "verified"], "TRK-207")

        # --- Certificates & ESG ---
        if agreement_fulfilled:
            existing_cert = await db.execute(
                select(GreenCertificate).where(GreenCertificate.agreement_id == agreement_fulfilled.id)
            )
            if not existing_cert.scalar_one_or_none():
                await issue_green_certificate(agreement_fulfilled, db)

        await db.commit()
        print("Database seeded successfully with full mock workflow data!")


if __name__ == "__main__":
    asyncio.run(seed_data(force=True))
