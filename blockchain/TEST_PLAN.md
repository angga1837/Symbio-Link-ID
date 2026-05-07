# 🧪 MVP Blockchain Bridge - Test Plan

This document outlines the steps to verify the **Symbio-Link ID** Blockchain Gateway before the live demo recording.

## 1. System Initialization
**Goal:** Verify the gateway starts correctly with the new industrial-grade branding.

- **Action:** Run `node gateway.js` inside the `/blockchain` directory.
- **Expected Terminal Output:**
  ```text
  [ESG-LEDGER-NODE] SYSTEM INITIALIZED. LISTENING ON PORT 4000...
  ```

## 2. Transaction Commit (Write Phase)
**Goal:** Simulate data coming from the Engine (ML/MILP) and verify the cryptographic logging.

- **Action:** Execute the following `curl` command:
  ```bash
  curl -X POST http://localhost:4000/commit \
    -H "Content-Type: application/json" \
    -d '{
      "sender": "FACTORY-ALPHA",
      "material": "Recycled Polymer",
      "volume": 2500,
      "ml_purity": 0.982
    }'
  ```
- **Verification (Terminal):**
  - [ ] Does it show `[ESG-LEDGER-NODE] INCOMING TRANSACTION DETECTED`?
  - [ ] Does it show `[CRYPTOGRAPHY] GENERATING SHA-256 HASH...`?
  - [ ] Does it return a JSON response with `status: "success"` and a `tx_hash`?

## 3. Ledger History Query (Read Phase)
**Goal:** Verify the safeguard cache retrieves the audit trail correctly.

- **Action:** Execute the following `curl` command:
  ```bash
  curl http://localhost:4000/history
  ```
- **Verification (Terminal):**
  - [ ] Does it show `[ESG-LEDGER-NODE] FETCHING BLOCKS FROM MICROFAB NETWORK...`?
  - [ ] Does it log the correct number of retrieved records?
- **Verification (Response):**
  - [ ] Does the `data` array contain the transaction sent in Step 2?

## 4. Visual Impact Check (Demo Quality)
**Goal:** Ensure the logs are readable and impressive for the screen recording.

- **Checklist:**
  - [ ] Terminal window is wide enough to show the `====` separators.
  - [ ] Logs are clearly separated by newlines for readability.
  - [ ] Response times are under 100ms (standard for local simulation).

## 5. Integration Fallback Test
**Goal:** Ensure legacy endpoints still function for backward compatibility.

- **Action:** `GET http://localhost:4000/health`
- **Expected:** `{ "status": "ok", "service": "blockchain-gateway" }`
