from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Symbio-Link ID Engine (BISMILLAH MENANG)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

class WasteData(BaseModel):
    Perusahaan: str     
    Bahan: str    
    volume: float    

@app.get("/")
def read_root():
    return {"message": "Engine Symbio-Link ID Active!"}

@app.post("/optimize") # untuk mlna
async def receive_data(data: WasteData):
    return {
        "status": "200 OK",
        "message": f"Data dari {data.sender} berhasil diterima untuk optimasi.",
        "processed_data": data
    }