from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Symbio-Link ID Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WasteData(BaseModel):
    sender_factory_id: str
    material_type: str
    volume_kg: float
    ph_level: float = None

@app.post("/optimize")
async def optimize(data: WasteData):
    return {
        "sender_factory_id": data.sender_factory_id,
        "material_type": data.material_type,
        "volume_kg": data.volume_kg,
        "system_outputs": {
            "ml_purity_score": 0.986,
            "optimization_status": "MATCH_FOUND",
            "blockchain_tx_hash": "0x8f92a11b22e"
        }
    }
