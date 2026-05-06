import requests
import logging
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def commit_to_ledger(payload: dict) -> str:
    """
    Commit a transaction payload to the blockchain gateway.
    Returns the tx_hash on success, or a fallback hash on failure.
    """
    try:
        logger.info(f"Committing to blockchain: {payload.get('type', 'UNKNOWN')}")
        response = requests.post(
            f"{settings.BLOCKCHAIN_URL}/commit",
            json=payload,
            timeout=5,
        )
        response.raise_for_status()
        bc_data = response.json()
        tx_hash = bc_data.get("tx_hash", "0x_LIVE_HASH")
        logger.info(f"Blockchain commit success: {tx_hash}")
        return tx_hash
    except Exception as e:
        logger.error(f"Blockchain Gateway Error: {str(e)}")
        import hashlib
        fallback = hashlib.sha256(str(payload).encode()).hexdigest()[:32]
        return f"FALLBACK_{fallback}"


async def commit_shipment_status(shipment_id: str, status: str, metadata: dict | None = None) -> str:
    """Commit a shipment status change to the blockchain."""
    try:
        response = requests.post(
            f"{settings.BLOCKCHAIN_URL}/shipment-status",
            json={
                "shipment_id": shipment_id,
                "status": status,
                "metadata": metadata or {},
            },
            timeout=5,
        )
        response.raise_for_status()
        return response.json().get("tx_hash", "PENDING")
    except Exception as e:
        logger.error(f"Shipment status commit error: {str(e)}")
        import hashlib
        return f"FALLBACK_{hashlib.sha256(f'{shipment_id}{status}'.encode()).hexdigest()[:32]}"


async def commit_certificate(cert_data: dict) -> str:
    """Commit a green certificate to the blockchain."""
    try:
        response = requests.post(
            f"{settings.BLOCKCHAIN_URL}/certificates",
            json=cert_data,
            timeout=5,
        )
        response.raise_for_status()
        return response.json().get("tx_hash", "PENDING")
    except Exception as e:
        logger.error(f"Certificate commit error: {str(e)}")
        import hashlib
        return f"FALLBACK_{hashlib.sha256(str(cert_data).encode()).hexdigest()[:32]}"


async def fetch_regulatory_audit() -> dict:
    """Fetch full audit trail from blockchain for regulatory review."""
    try:
        response = requests.get(
            f"{settings.BLOCKCHAIN_URL}/audit/regulatory",
            timeout=5,
        )
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        logger.error(f"Regulatory audit fetch error: {str(e)}")
    return {"total": 0, "records": []}
