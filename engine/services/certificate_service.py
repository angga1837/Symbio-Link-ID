import secrets
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from models.agreement import Agreement
from models.esg import GreenCertificate, ESGRecord
from services.blockchain_service import commit_certificate
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def issue_green_certificate(agreement: Agreement, db: AsyncSession) -> GreenCertificate:
    """
    Auto-generate a Green Certificate for a fulfilled agreement.
    Commits proof to blockchain and creates ESG records.
    """
    co2_saved = agreement.agreed_volume_kg * settings.CO2_FACTOR
    cert_number = f"SYM-GC-{secrets.token_hex(4).upper()}"

    # Commit to blockchain
    tx_hash = await commit_certificate({
        "certificate_number": cert_number,
        "agreement_id": str(agreement.id),
        "co2_saved_kg": co2_saved,
        "material_reused_kg": agreement.agreed_volume_kg,
        "sender_org": str(agreement.sender_org_id),
        "receiver_org": str(agreement.receiver_org_id),
    })

    cert = GreenCertificate(
        org_id=agreement.sender_org_id,
        agreement_id=agreement.id,
        certificate_number=cert_number,
        co2_saved_kg=co2_saved,
        material_reused_kg=agreement.agreed_volume_kg,
        blockchain_tx_hash=tx_hash,
    )
    db.add(cert)

    # Create ESG records for both parties
    for org_id in [agreement.sender_org_id, agreement.receiver_org_id]:
        db.add(ESGRecord(
            org_id=org_id,
            agreement_id=agreement.id,
            record_type="co2_offset",
            value=co2_saved,
            unit="kg_co2",
            blockchain_tx_hash=tx_hash,
            verified=True,
        ))
        db.add(ESGRecord(
            org_id=org_id,
            agreement_id=agreement.id,
            record_type="material_reuse",
            value=agreement.agreed_volume_kg,
            unit="kg",
            blockchain_tx_hash=tx_hash,
            verified=True,
        ))

    await db.flush()
    await db.refresh(cert)
    logger.info(f"Green Certificate issued: {cert_number} | CO2: {co2_saved}kg | TX: {tx_hash}")
    return cert
