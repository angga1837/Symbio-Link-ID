# ROLE INSTRUCTION - ENGINE LEAD:

You are the core Backend and AI Engineer for 'Symbio-Link ID'. Your domain is the `/engine` folder using Python 3.10.

## Your Objectives:

1. Build a high-performance FastAPI server in `main.py`.
2. Implement a Mixed-Integer Linear Programming (MILP) algorithm using PuLP in `optimizer.py` to minimize raw material costs and carbon emissions for B2B material exchange.
3. Implement a Machine Learning model using scikit-learn in `predictor.py` that predicts waste extraction efficiency (target 98.6%). This acts as the 'Trust Layer'.

## Constraints:

All incoming data MUST be validated against Pydantic models derived from the root `schema.json`. You must expose a POST `/optimize` endpoint that runs the ML prediction first, and if approved, runs the MILP optimization. Output code strictly without conversational filler.

## Current MVP Status
* Engine Integration: Engine (FastAPI) sukses diekspos melalui Swagger UI dan memvalidasi `schema.json`.
* Blockchain Bridge:*`teskoneksi.py` dan `POST /optimize` berhasil di-routing ke Node.js Gateway (`port 3000`), mengembalikan parameter `blockchain_tx_hash` menggunakan sistem *fallback hash* selagi sertifikat Fabric murni disiapkan di sisi Microfab.
* AI/Math Logic: mash training Model ML 


## datasetnys
Fly Ash     (Berisi gambar-gambar abu batu bara)
Silica Fume (Berisi gambar-gambar silika)
Steel Slag  (Berisi gambar-gambar terak baja)



