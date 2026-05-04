from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import requests
import os

from optimizer import solve_symbiosis_milp
from predictor import predict_quality
from vision_predictor import predict_image

app = FastAPI(title="Symbio-Link ID Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BLOCKCHAIN_GATEWAY_URL = os.getenv("BLOCKCHAIN_URL", "http://blockchain:4000")

# Untuk menyimpan data sambil nunggu /history
temp_audit_db = []

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
    
    if predicted_material in ["Gagal Identifikasi", "Model Tidak Tersedia"]:
         raise HTTPException(status_code=500, detail=predicted_material)
         
    return {"predicted_material": predicted_material}
   
@app.post("/optimize")
async def optimize(data: SymbiosisRequest):
    # Trust layer makai ML regresi
    ml_score = predict_quality(data.ph_level, data.moisture, data.volume_kg)

    if ml_score < 0.80:
        return {
            "status": "REJECTED",
            "reason": "Limbah tidak memenuhi standar ekstraksi kritis (<80% purity score).",
            "ml_purity_score": ml_score
        }

    # Optimisasi layer makai MILP
    milp_result = solve_symbiosis_milp(data.sender_factory_id, data.volume_kg)
    optimization_status = "MATCH_FOUND" if milp_result["status"] == "OPTIMAL" else "FAILED"
    
    if optimization_status == "FAILED":
        return {
            "status": "FAILED",
            "reason": "Tidak ditemukan rute optimasi supply-demand yang memungkinkan.",
            "ml_purity_score": ml_score
        }

    # Kalkulasi CO2 saved dari MILP
    co2_saved_kg = milp_result.get("co2_saved_kg", data.volume_kg * 0.45)

    # Layer ngirim ke blockchain
    payload = data.model_dump()
    payload["optimal_routes"] = milp_result.get("routes", {})
    payload["total_cost"] = milp_result.get("optimal_cost", 0)
    payload["ml_purity_score"] = ml_score
    payload["co2_saved_kg"] = co2_saved_kg
    
    tx_hash = "PENDING"
    try:
        response = requests.post(f"{BLOCKCHAIN_GATEWAY_URL}/commit", json=payload, timeout=5)
        if response.status_code in [200, 201]:
            bc_data = response.json()
            tx_hash = bc_data.get("tx_hash", "0x8f92a11b22e_LIVE")
        else:
            tx_hash = f"ERROR_{response.status_code}"
    except Exception:
        tx_hash = "0x8f92a11b22e_MOCK_FALLBACK"

    # Simpan data ke engine (sementara)
    audit_entry = {
        "sender_factory_id": data.sender_factory_id,
        "material_type": data.material_type,
        "volume_kg": data.volume_kg,
        "co2_saved_kg": co2_saved_kg,
        "ml_purity_score": ml_score,
        "blockchain_tx_hash": tx_hash,
        "status": optimization_status
    }
    temp_audit_db.insert(0, audit_entry)
    return {
        "sender_factory_id": data.sender_factory_id,
        "material_type": data.material_type,
        "volume_kg": data.volume_kg,
        "system_outputs": {
            "ml_purity_score": ml_score,
            "optimization_status": optimization_status,
            "blockchain_tx_hash": tx_hash,
            "co2_saved_kg": co2_saved_kg,
            "optimization_details": milp_result
        }
    }

@app.get("/audit")
async def get_audit_trail():
    #nyoba tarik dari Blockchain /history. Nek gagal/belum siap, berikan data sementara dari Engine.
    try:
        response = requests.get(f"{BLOCKCHAIN_GATEWAY_URL}/history", timeout=2)
        if response.status_code == 200:
            return response.json()
        else:
            # Endpoint belum ada jadi makai data engine
            return {"total": len(temp_audit_db), "items": temp_audit_db, "source": "Engine Mock (Blockchain Not Ready)"}
    except Exception as e:
        return {"total": len(temp_audit_db), "items": temp_audit_db, "source": "Engine Mock (Connection Error)"}