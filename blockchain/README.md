# Symbio-Link ID: Blockchain Integration Bridge

This service provides a production-grade RESTful bridge between the Symbio-Link AI Engine and a Hyperledger Fabric blockchain network. It is designed for **ESG Integrity** and **Immutable Audit Trails**.

## 🛡️ Core Architecture: Dual-Write Safeguard
To ensure maximum reliability during Hackathon demos and production deployments, the gateway implements a **Dual-Write Strategy**:
1.  **Primary**: Attempt to commit the transaction to the Hyperledger Fabric ledger via the official SDK.
2.  **Safeguard**: If the peer is unreachable or busy, the system instantly activates a local cryptographic safeguard to generate a verifiable hash and maintain system continuity.

## 🚀 Quick Start

### 1. Infrastructure (Microfab)
Start the Hyperledger Fabric node:
```bash
docker compose -f docker-compose.microfab.yml up -d
```

### 2. Gateway Setup
Install dependencies and launch the API bridge:
```bash
npm install
node gateway.js
```

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/commit` | **Main Bridge**: Commit factory data to the ledger (with auto-fallback). |
| `GET` | `/history` | **Audit Trail**: Retrieve the full history of blocks and commits. |
| `GET` | `/health` | Check the status of the Gateway and Fabric connection. |
| `GET` | `/transactions` | List all cached transaction metadata. |

### Usage Example (`POST /commit`)
Send factory data to the ledger using the following template:

```bash
curl -X POST http://localhost:4000/commit \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "SYM-FACTORY-001",
    "material": "Recycled Plastic",
    "volume": 250
  }'
```

### Payload Support
The bridge is highly compatible and accepts multiple naming conventions:
- **Sender**: `sender_factory_id`, `Perusahaan`, or `sender`
- **Material**: `material_type` or `Bahan`
- **Volume**: `volume_kg` or `volume`

## 🛠️ Configuration (.env)
- `BLOCKCHAIN_MODE`: 
  - `fabric`: Strict mode (Real commits).
  - `mock`: Simulation mode (Demo-ready stability).
- `FABRIC_CHANNEL`: Default `mychannel`.
- `FABRIC_CHAINCODE`: Default `symbiosis`.

---
*Built for the IYREF Hackathon - Ensuring Transparency in the Circular Economy.*
