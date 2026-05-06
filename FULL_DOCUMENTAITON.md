# FULL_DOCUMENTATION - Symbio-Link ID Architecture & Code Audit

This document provides a comprehensive technical audit of the Symbio-Link-ID monorepo. It details the file structures, functional logic, and inferred grand architecture of the B2B Industrial Symbiosis Marketplace MVP.

## 1. GRAND ARCHITECTURE OVERVIEW

The Symbio-Link-ID platform uses a 3-tier decoupled microservice architecture consisting of a UI Layer, an AI/Optimization Engine, and a Blockchain Ledger Gateway.

### Architecture Flow:
1. **Client Request**: The user interacts with the **Frontend** (Next.js) to submit waste details via a form (`WasteForm`). They can optionally upload an image which is sent to the Engine for auto-classification using Computer Vision.
2. **Orchestration & Validation**: The **Engine** (FastAPI) receives the payload via `/optimize`.
   - **Quality Check**: It runs an ML regression model to verify if the material purity score is high enough (>= 60%).
   - **Route Optimization**: It invokes a Mixed-Integer Linear Programming (MILP) solver (via PuLP) to find optimal transport routes to match supply with mock demand destinations, minimizing logistics costs and calculating CO2 saved.
3. **Immutability & Audit**: Upon successful optimization, the Engine proxies the finalized payload to the **Blockchain Gateway** (Express.js) via `/commit`.
   - **Dual-Write Strategy**: The gateway attempts to commit to a Hyperledger Fabric peer. If the peer is offline, it gracefully falls back to an in-memory cache, ensuring the system remains highly available and the UI does not freeze.
4. **Data Sync**: The Frontend regularly polls the Engine's `/audit` endpoint, which in turn queries the Blockchain's `/history`, to update the user's dashboard with real-time audit trails and CO2 emission charts.

---

## 2. FRONTEND AUDIT (`/frontend`)

Next.js 14 application acting as the UI/UX layer. It handles user state, form submissions, and data visualization.

### Key Directories & Files:
- **`src/app/page.tsx`**: The main dashboard orchestrator. Manages state for `results` and a `refreshTrigger` to cascade updates down to children components after successful optimizations.
- **`src/components/WasteForm.tsx`**: 
  - **Functions**: Captures factory ID, material type, volume, etc. Handles image upload by dispatching `FormData` to the engine's `/classify` endpoint for auto-detection. Validates inputs using `zod` and submits final payload to the engine's `/optimize` endpoint.
- **`src/components/AuditTrail.tsx`**: 
  - **Functions**: Queries the Engine's `/audit` endpoint to fetch the history of symbiosis transactions (either from the blockchain or the engine's fallback mock DB) and renders them in a table.
- **`src/components/EmissionChart.tsx`**:
  - **Functions**: Consumes the optimization results to map out graphical representations of CO2 offsets or material volume streams.
- **`tailwind.config.ts` & `globals.css`**: Define the styling architecture, providing utility classes for the React components.

---

## 3. ENGINE AUDIT (`/engine`)

Python FastAPI backend responsible for heavy-lifting computations, Machine Learning, and Operational Research algorithms.

### Key Directories & Files:
- **`main.py`**: The FastAPI server entry point.
  - **`POST /classify`**: Takes a file upload, invokes `predict_image()` to return a classified string (e.g., 'Fly Ash').
  - **`POST /optimize`**: The core pipeline. Validates payload (`SymbiosisRequest`), calls `predict_quality()` for trust gating, runs `solve_symbiosis_milp()` for routing, posts the aggregated data to the Blockchain Gateway, and saves a local fallback copy in `temp_audit_db`.
  - **`GET /audit`**: Proxies requests to the blockchain's `/history` to fetch the ledger, falling back to local memory if the blockchain is unreachable.
- **`vision_predictor.py`**:
  - **Functions**: Uses TensorFlow and `MobileNetV2` architecture to load `best_vision_model.h5`. Processes incoming image bytes and predicts between `['Fly Ash', 'Silica Fume', 'Steel Slag']`. Includes robust fallback loading strategies if standard loading fails.
- **`optimizer.py`**:
  - **Functions**: Implements the `solve_symbiosis_milp` function. Sets up a Mixed-Integer Linear Programming problem using `pulp`. Defines mock demand data (`PT_Semen_B`, `PT_Beton_C`), mock cost matrices, and computes optimal supply constraints. Returns the calculated routes and CO2 saved.
- **`predictor.py`**:
  - **Functions**: Loads an ML `.pkl` model (or returns a fallback default score) to predict the purity score based on pH, moisture, and volume.

---

## 4. BLOCKCHAIN GATEWAY AUDIT (`/blockchain`)

Node.js / Express server wrapping the Hyperledger Fabric SDK. Acts as the transaction bridge for immutable records.

### Key Directories & Files:
- **`gateway.js`**: The Express server exposing REST APIs for the ledger.
  - **`POST /commit`**: Receives finalized payloads from the Engine. Evaluates connection mode (`BLOCKCHAIN_MODE`). Calls `submitToFabric()` for on-chain writes. If it catches a failure, activates the "Safeguard Failover Mode" and stores it in `transactionLedgerCache` with a locally generated SHA-256 hash.
  - **`GET /history`**: Returns the cache/ledger history reflecting the system's transaction state.
  - **`GET /transactions/:txHash`**: Fetches specific transactions from memory.
- **`fabricGateway.js`**:
  - **Functions**: Houses the `submitToFabric()` logic. Initiates connection using the Fabric Node SDK to interact with the underlying chaincode.
- **`chaincode/symbiosis_contract.js`**:
  - **Functions**: The smart contract extending Fabric's `Contract` class. Contains methods like `CreateTransaction` (uses `putState` to enforce immutability) and `QueryAllTransactions` (uses `getStateByRange` to fetch existing records).

---

## 5. SYSTEM RESILIENCE & DESIGN PATTERNS
- **Fault-Tolerant Dual-Write**: The Blockchain Gateway's ability to gracefully degrade to local cache ensures the UI Demo remains functional without requiring a heavy, live Hyperledger node configuration.
- **Trust Gateway Pattern**: The Engine acts as a gatekeeper, instantly rejecting invalid inputs (e.g., Purity Score < 60%) before wasting solver resources or blockchain space.
- **Containerized Modularity**: As evidenced by `docker-compose.yml`, components are perfectly isolated (`frontend` on port 3000, `engine` on 8000, `blockchain` on 4000) allowing independent scaling and isolated testing.
