from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import requests
import os

from optimizer import solve_symbiosis_milp
from predictor import predict_quality
from vision_predictor import predict_image
import logging

# Setup Terminal Logging ala Industrial
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] [ENGINE] %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Symbio-Link ID Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audit ledger: stores all transactions for ESG tracking
audit_ledger: List[dict] = []

BLOCKCHAIN_GATEWAY_URL = os.getenv("BLOCKCHAIN_URL", "http://symbio-link-blockchain:3000")

class SymbiosisRequest(BaseModel):
    sender_factory_id: str = Field(..., description="ID unik pabrik pengirim limbah")
    material_type: str = Field(..., description="Jenis material sisa (misal: Sludge Tembaga, Fly Ash)")
    volume_kg: float = Field(..., description="Berat material dalam kilogram")
    ph_level: float = Field(default=7.0, description="Tingkat keasaman untuk prediksi ML")
    moisture: Optional[float] = Field(10.0, description="Tingkat kelembapan untuk prediksi ML (%)")


@app.post("/classify")
async def classify_material_image(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Tidak ada file yang diunggah")
    
    image_bytes = await file.read()
    predicted_material = predict_image(image_bytes)
    
    if predicted_material == "Gagal Identifikasi" or predicted_material == "Model Tidak Tersedia":
         raise HTTPException(status_code=500, detail=predicted_material)
         
    return {"predicted_material": predicted_material}
   
@app.post("/optimize")
async def optimize(data: SymbiosisRequest):
    try:
        logger.info(f"Incoming payload from {data.sender_factory_id}: {data.material_type} ({data.volume_kg}kg)")

        # 1. ML Layer
        ml_score = predict_quality(data.ph_level, data.moisture, data.volume_kg)
        if ml_score < 0.80:
            logger.warning(f"ML Rejection: Quality score {ml_score} below threshold.")
            return {
                "status": "REJECTED",
                "reason": "Limbah tidak memenuhi standar ekstraksi kritis (<80% purity score).",
                "ml_purity_score": ml_score,
            }

        # 2. MILP Layer
        logger.info("Executing PuLP MILP Optimization...")
        milp_result = solve_symbiosis_milp(data.sender_factory_id, data.volume_kg)
        optimization_status = "MATCH_FOUND" if milp_result["status"] == "OPTIMAL" else "FAILED"
        if optimization_status == "FAILED":
            logger.warning("Optimization failed to find feasible routes.")
            return {
                "status": "FAILED",
                "reason": "Tidak ditemukan rute optimasi supply-demand yang memungkinkan.",
                "ml_purity_score": ml_score,
            }

        co2_saved_kg = data.volume_kg * 0.45

        # 3. Blockchain Gateway Call with fallback handling
        payload = data.model_dump()
        payload["optimal_routes"] = milp_result.get("routes", {})
        payload["total_cost"] = milp_result.get("optimal_cost", 0)
        payload["ml_purity_score"] = ml_score

        tx_hash = "PENDING"
        try:
            response = requests.post(f"{BLOCKCHAIN_GATEWAY_URL}/transactions", json=payload, timeout=5)
            response.raise_for_status()
            bc_data = response.json()
            tx_hash = bc_data.get("blockchain_tx_hash", "FALLBACK_CACHE_HASH_0x1")
            logger.info(f"Blockchain commit success: {tx_hash}")
        except Exception as e:
            logger.error(f"Blockchain Gateway Error: {str(e)}")
            tx_hash = "FALLBACK_CACHE_HASH_0x1"

        result = {
            "sender_factory_id": data.sender_factory_id,
            "material_type": data.material_type,
            "volume_kg": data.volume_kg,
            "system_outputs": {
                "ml_purity_score": ml_score,
                "optimization_status": optimization_status,
                "blockchain_tx_hash": tx_hash,
                "optimization_details": milp_result,
            },
            "co2_saved_kg": co2_saved_kg,
        }

        # Record to audit ledger
        audit_ledger.append(result)

        return result

    except Exception as e:
        logger.error(f"CRITICAL ENGINE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Terjadi kesalahan internal pada Engine Optimasi.")


@app.get("/audit")
async def get_audit_trail() -> List[dict]:
    """Retrieve all audit trail entries (ESG transaction ledger)."""
    return audit_ledger