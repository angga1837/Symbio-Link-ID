from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import requests

app = FastAPI(title="Symbio-Link ID Engine (BISMILLAH MENANG FOR 5 MILLIONNN)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

BLOCKCHAIN_GATEWAY_URL = "http://blockchain:3000"

class SymbiosisRequest(BaseModel):
    sender_factory_id: str = Field(..., description="ID unik pabrik pengirim limbah")
    material_type: str = Field(..., description="Jenis material sisa (misal: Sludge Tembaga)")
    volume_kg: float = Field(..., description="Berat material dalam kilogram")
    ph_level: Optional[float] = Field(None, description="Tingkat keasaman untuk prediksi ML")

@app.get("/")
def read_root():
    return {"message": "Engine Symbio-Link ID Active!"}

@app.post("/optimize")
async def optimize_flow(data: SymbiosisRequest):
    # Mock ML & MILP outputs (Sedang kumpul datasetwak )
    ml_purity_score = 0.98
    optimization_status = "MATCH_FOUND"
    
    payload = data.model_dump()
    tx_hash = "PENDING"

    # Integrasi POST data ke Blockchain Gateway
    try:
        response = requests.post(f"{BLOCKCHAIN_GATEWAY_URL}/transactions", json=payload, timeout=5)
        if response.status_code in [200, 201]:
            bc_data = response.json()
            tx_hash = bc_data.get("blockchain_tx_hash", "MOCK_HASH_12345_KARENA_BLOCKCHAIN_BELUM_SIAP")
        else:
            tx_hash = f"ERROR_{response.status_code}"
    except Exception as e:
        tx_hash = f"CONNECTION_FAILED_TO_BLOCKCHAIN: {str(e)}"

    return {
        "status": "200 OK",
        "message": f"Data material {data.material_type} dari {data.sender_factory_id} berhasil diterima.",
        "processed_data": payload,
        "system_outputs": {
            "ml_purity_score": ml_purity_score,
            "optimization_status": optimization_status,
            "blockchain_tx_hash": tx_hash
        }
    }