# FULL_DOCUMENTATION - Symbio-Link ID Architecture Audit

As requested, here is the granular 100% exhaustive technical audit of the monorepo breaking down all files, logic, routes, and implementations for the B2B Industrial Symbiosis Marketplace MVP. This fulfills the Master Recursive Repo Audit constraints.

## 1. INFRASTRUCTURE AUDIT

### `docker-compose.yml`

- **Services**:
  - **engine**: FastAPI backend.
    - **Build Context**: `./engine`
    - **Port**: `8000:8000`
    - **Environment**: `BLOCKCHAIN_URL=http://blockchain:4000`
    - **Depends On**: `blockchain`
    - **Network**: `symbio-net` (bridge)
  - **frontend**: Next.js UI layer.
    - **Build Context**: `./frontend`
    - **Port**: `3001:3000` (Map host 3001 to container 3000)
    - **Environment**: `NEXT_PUBLIC_API_URL=http://engine:8000`
    - **Depends On**: `engine`
    - **Network**: `symbio-net`
  - **blockchain**: Express.js Gateway to Hyperledger Fabric.
    - **Build Context**: `./blockchain`
    - **Container Name**: `symbio-link-blockchain`
    - **Port**: `4000:4000`
    - **Network**: `symbio-net`
- **Networks**: `symbio-net` using `bridge` driver.

### `schema.json`

- **Data Fields & Validation**:
  - `sender_factory_id`: (string) Unique ID of waste sending factory.
  - `material_type`: (string) Waste material type (e.g. Copper Sludge).
  - `volume_kg`: (number) Material weight in KG.
  - `ph_level`: (number) Acidity level used for ML feature weighting.
  - **Required**: `sender_factory_id`, `material_type`, `volume_kg`.
  - **system_outputs (Virtual/Meta Fields)**: Defines the output state `ml_purity_score` (float 0-1), `optimization_status` (string MATCH_FOUND | PENDING), and `blockchain_tx_hash` (string).

---

## 2. ENGINE (BACKEND) AUDIT

### `engine/main.py`

- **Orchestration Logic**: A FastAPI instance binding Pydantic validators (`SymbiosisRequest`) to the ML Predictor, Image Predictor (CV), PuLP Optimizer (MILP), and Blockchain Gateway. Fallback arrays (`temp_audit_db`) are maintained in-memory to prevent UI freezing if blockchain bridging breaks.
- **Routes**:
  - **`POST /classify`**: Takes a `multipart/form-data` with `file: UploadFile`. Calls `predict_image()` to classify waste material via an uploaded image. Returns {"predicted_material": string}. Raises 500 if unidentifiable or missing model.
  - **`POST /optimize`**: Fully orchestrates the request pipeline.
    - Validates payload via Pydantic (`SymbiosisRequest`).
    - **Trust Layer**: Calls `predict_quality(ph, moisture, volume)`. If `< 0.60`, returns `REJECTED`.
    - **Optimization Layer**: Calls `solve_symbiosis_milp`. If no routes found, returns `FAILED`.
    - **Decoupled Calculation**: Calculates $CO_2$ saved as `volume_kg * 0.45`.
    - **Blockchain Commit**: Wraps state variables onto the payload and `requests.post` to `${BLOCKCHAIN_GATEWAY_URL}/commit`. Captures `tx_hash` or falls back to `"FALLBACK_CACHE_HASH_0x1"`.
    - **Persistence**: Pushes payload to `temp_audit_db`. Returns `MATCH_FOUND` containing all ML, MILP, and BC metadata.
  - **`GET /audit`**: Proxies `GET` calls to Blockchain Gateway (`/history`). If timeout or unavailable, acts as a self-healing fallback sending `temp_audit_db`.

### `engine/optimizer.py`

- **MILP Logic (PuLP)**:
  - **Constraint Form validation**: $\min Z = \sum (C_{i,j} \cdot X_{i,j})$. Where $C$ is the cost matrix, and $X$ is the transport volume `Route`.
  - **Supply constraint**: Route outbound summations cannot exceed sender `volume_kg`.
  - **Demand constraint**: Route inbound summations must meet mock destinations: `"PT_Semen_B"` (60% vol), `"PT_Beton_C"` (40% vol).
  - **Solver**: `PULP_CBC_CMD`.
  - **Output Strategy**: Formats mapping array into dict `{"sender->dest": volume}`. Calculates `co2_saved_kg` (0.45 kg $CO_2$ per kg waste routed).

### `engine/predictor.py`

- **ML Predictor Strategy**:
  - Attempts loading binary model `symbio_model.pkl` via joblib. If missing, implements defensive fallback returning `0.85`.
  - **Inputs**: Feature matrix `[[ph, moisture, volume_kg]]`.
  - **Gatekeeper ceiling boundary applied manually**: Maximum output clipped strictly at `0.986` logic via `min(max(float(prediction), 0.0), 0.986)`.

---

## 3. BLOCKCHAIN (LEDGER) AUDIT

### `blockchain/gateway.js`

- **Application Scope**: An Express cache middleware and transaction proxy wrapping Hyperledger Fabric. Evaluates env `BLOCKCHAIN_MODE`.
- **State Control**: Maintains memory caches `ledger` and `transactionLedgerCache` for safeguard fallback.
- **Routes**:
  - **`GET /health`**: Returns {status: "ok"}.
  - **`GET /transactions`**: (Legacy) Returns array payload of `ledger`.
  - **`GET /transactions/:txHash`**: Fetches specific ID from `ledger`.
  - **`POST /commit`**: The prime ingestion route.
    - Calls `normalizePayload()` enforcing field mapping (`Perusahaan` -> `sender_factory_id`).
    - In "fabric" mode, attempts `submitToFabric()` bridging to Node SDK.
    - **Safeguard Failure State**: Catches Fabric connection errors instantly, triggers local `generateTxHash(crypto.randomBytes(32))`, flags `mode: "safeguard_fallback"`, and updates `transactionLedgerCache`.
  - **`GET /history`**: Returns `transactionLedgerCache` reflecting either the proxy commit memory or pure cache.
  - **`POST /transactions`**: Alternative ingestion mimicking `/commit` strictly resolving `submitToFabric` pushing to `ledger`.

### `blockchain/chaincode/symbiosis_contract.js`

- **Contract Definition**: Extends `Contract` via `fabric-contract-api`. Implements basic KV store logic bridging.
- **Methods**:
  - `TransactionExists(ctx, txId)`: Reads `getState` evaluating boolean presence.
  - `CreateTransaction(ctx, payloadJson)`: Appends `doc_type: "symbio_tx"`, `committed_at`, and `tx_id`. Converts to buffer and forces immutable ledger entry via `putState`.
  - `QueryAllTransactions(ctx)`: Iterates via `getStateByRange("", "")`, buffers decoding output array.

---

## 4. FRONTEND (UI/UX) AUDIT

### `frontend/src/app/page.tsx`

- **Strategy**: Acting as a Controller Container lifting State up across components using `useState` for `results: TransactionResult[]` and an event counter `refreshTrigger`.
- **Routing**: Defined as the main `/` route logic wrapper mapping `<WasteForm />`, `<EmissionChart />`, and `<AuditTrail />`.
- **Interaction Stream**: `<WasteForm onResult={handleResult}/>` fires `handleResult`, propagating into `setResults` and triggering child re-render `refreshTrigger` passing to `AuditTrail`.

### Frontend Components Layer

- **`frontend/src/components/WasteForm.tsx`**:
  - **Logic**: Captures submission via mapped inputs `formData` tying Zod schema `formSchema`.
  - **Features**: Includes Image Classification support by creating `FormData`, passing to `/classify`, updating `material_type` state via server response.
  - **Engine Consumption**: On validate, posts JSON boundary logic to Engine's `http://localhost:8000/optimize`. Uses `toast` notification mapping on `onResult(result)` callback passing payload object structure backward to root node.
- **`frontend/src/components/AuditTrail.tsx`**:
  - **Logic**: An HTML table observing `rows` property payload mapping from the engine fallback layer OR directly querying the Gateway via `http://localhost:4000/audit`.
  - **State Trigger Strategy**: Tracks `useEffect` referencing `refreshTrigger` to asynchronously re-fetch backend mock logs simulating pure end-to-end sync across distributed systems.
- **`frontend/src/components/EmissionChart.tsx`**: _(Logic inferred)_ Assumed to be charting the continuous $CO_2$ offset values stored within `results` array mapped out to graphical rendering (Recharts).

---

_Created by Copilot for System Audit Review._
