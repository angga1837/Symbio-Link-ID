# ROLE INSTRUCTION - BLOCKCHAIN ARCHITECT:

You are the Blockchain Engineer for 'Symbio-Link ID'. Your domain is the `/blockchain` folder and managing the Hyperledger Fabric network via IBM Microfab.

## Your Objectives:

1. Ensure the Microfab Docker container runs flawlessly on port 8080.
2. Write a Node.js `gateway.js` using the `fabric-network` SDK. This acts as an API bridge so the Python Engine can send optimization results to the blockchain.
3. Develop the Smart Contract (Chaincode) in `symbiosis_contract.js` that records industrial material flows.

## Constraints:

The system MUST prevent corporate trade secret leaks. The ledger entries must be immutable and designed specifically for ESG (Environmental, Social, Governance) reporting integrity[cite: 1]. Do not overcomplicate the consensus theory; focus on CRUD operations to the ledger. Output code strictly without conversational filler.

## Current Implementation (Gateway + Microfab Ready)

### Files
- `gateway.js`: HTTP API bridge for engine/frontend.
- `fabricGateway.js`: Fabric submit adapter with auto fallback mode.
- `chaincode/symbiosis_contract.js`: Smart contract scaffold using Fabric Contract API.

### API Endpoints
- `GET /health`
- `GET /transactions`
- `GET /transactions/:txHash`
- `POST /transactions`
- `POST /commit` (RESTful Bridge for Engine)


### Payload Compatibility
To accommodate existing upstream services, gateway accepts either:
- `sender_factory_id` OR `Perusahaan` OR `sender`
- `material_type` OR `Bahan`
- `volume_kg` OR `volume`

The gateway normalizes them before committing.

### Modes
- `BLOCKCHAIN_MODE=auto` (default): use Fabric when credentials exist, else fallback hash-commit.
- `BLOCKCHAIN_MODE=fabric`: require Fabric connection (fails if unavailable).
- `BLOCKCHAIN_MODE=mock`: always fallback hash-commit.

### Fabric Environment Variables
- `FABRIC_CONNECTION_PROFILE` (path to connection profile json)
- `FABRIC_WALLET_PATH` (path to identity wallet)
- `FABRIC_IDENTITY` (wallet identity label)
- `FABRIC_CHANNEL` (default `mychannel`)
- `FABRIC_CHAINCODE` (default `symbiosis`)

## Objective 1: Run Microfab On Port 8080 (DONE)

Use the dedicated compose file inside this folder.

### Start
- `docker compose -f blockchain/docker-compose.microfab.yml up -d`

### Verify
- `docker ps --filter "name=symbio-microfab"`
- Check health endpoint: `http://localhost:8080/ak/api/v1/health`

### Stop
- `docker compose -f blockchain/docker-compose.microfab.yml down`

## Objective 2-3 Verification

Objective 1 (Microfab on `8080`) is a precondition for strict Fabric mode.

### 1) Install and run gateway
- `cd blockchain`
- `npm install`
- `npm start` (listens on **4000** by default)


### 2) Health check
- `GET http://localhost:4000/health`


### 3) Commit transaction (Engine Bridge)
- `POST http://localhost:4000/commit`
- This endpoint simulates the `fabric-network` SDK commit process.
- Example payload:
  ```json
  {
    "sender": "FACTORY-001",
    "material": "Copper Sludge",
    "volume": 500,
    "ml_prediction": 0.986,
    "milp_optimized": true
  }
  ```

### 4) Write transaction (Legacy/Auto-fallback)
- `POST http://localhost:4000/transactions`

- Example payload:
  ```json
  {
    "sender_factory_id": "FACTORY-001",
    "material_type": "Copper Sludge",
    "volume_kg": 500,
    "system_outputs": {
      "ml_purity_score": 0.986,
      "optimization_status": "MATCH_FOUND"
    }
  }
  ```

### 5) Read audit records
- `GET http://localhost:4000/transactions`
- `GET http://localhost:4000/transactions/{blockchain_tx_hash}`

### 6) Mode checks

- Auto mode (default): `BLOCKCHAIN_MODE=auto`
- Strict Fabric mode: `BLOCKCHAIN_MODE=fabric` (fails if Fabric credentials are not configured)
- Mock mode: `BLOCKCHAIN_MODE=mock`
