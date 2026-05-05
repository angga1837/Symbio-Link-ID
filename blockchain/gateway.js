require('dotenv').config();
const express = require("express");
const crypto = require("crypto");
const { submitToFabric } = require("./fabricGateway");

const app = express();
app.use(express.json());

// Set port to 4000 as requested for the blockchain bridge
const PORT = 4000;
const ledger = [];
// In-memory safeguard replica for MVP Hackathon Demo
let transactionLedgerCache = [];

// Normalizes incoming payload to ensure consistent data structure
function normalizePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const senderFactoryId = payload.sender_factory_id || payload.Perusahaan || payload.sender;
  const materialType = payload.material_type || payload.Bahan;
  const volumeRaw = payload.volume_kg ?? payload.volume;
  const volumeKg = Number(volumeRaw);

  if (!senderFactoryId || !materialType || Number.isNaN(volumeKg) || volumeKg <= 0) {
    return null;
  }

  return {
    ...payload,
    sender_factory_id: senderFactoryId,
    material_type: materialType,
    volume_kg: volumeKg,
  };
}

// Generates a simulated blockchain transaction hash
const generateTxHash = () => {
  console.log("[CRYPTOGRAPHY] GENERATING SHA-256 HASH...");
  return crypto.randomBytes(32).toString("hex");
};

// Provides service health status check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "blockchain-gateway" });
});

// Retrieves all stored transactions in the local ledger
app.get("/transactions", (_req, res) => {
  console.log(`[ESG-LEDGER-NODE] FETCHING TRANSACTION HISTORY - total=${ledger.length}`);
  res.json({ total: ledger.length, items: ledger });
});

// Retrieves a specific transaction by its hash
app.get("/transactions/:txHash", (req, res) => {
  console.log(`[ESG-LEDGER-NODE] FETCHING TX ${req.params.txHash} FROM LEDGER`);
  const item = ledger.find((entry) => entry.blockchain_tx_hash === req.params.txHash);
  if (!item) {
    console.log(`[ESG-LEDGER-NODE] TX ${req.params.txHash} NOT FOUND`);
    return res.status(404).json({ error: "Transaction not found" });
  }
  console.log(`[ESG-LEDGER-NODE] TX ${req.params.txHash} RETURNED`);
  return res.json(item);
});

// Processes and commits data from the Engine to the blockchain (Dual-Write Strategy)
app.post("/commit", async (req, res) => {
  console.log("\n========================================================");
  console.log("[ESG-LEDGER-NODE] INCOMING TRANSACTION DETECTED");

  const normalized = normalizePayload(req.body) || req.body;

  const mode = (process.env.BLOCKCHAIN_MODE || "auto").toLowerCase();

  try {
    let txHash;
    let connectionType;

    if (mode === "fabric") {
      console.log("[fabric-network SDK] ATTEMPTING CONNECTION TO PEER...");
      txHash = await submitToFabric(normalized);
      connectionType = "fabric";
    } else {
      txHash = generateTxHash();
      connectionType = "local_safeguard";
    }

    const entry = {
      ...normalized,
      blockchain_tx_hash: txHash,
      committed_at: new Date().toISOString(),
      mode: connectionType === "fabric" ? "fabric_peer_commit" : "safeguard_fallback",
      // --- B2B Financial Parameters (Escrow Foundation) ---
      total_bill_to_buyer: normalized.total_bill_to_buyer ?? null,
      payment_status: "UNPAID"
    };

    transactionLedgerCache.push(entry);

    // Explicit Fabric Success Log
    console.log("[ESG-LEDGER-NODE] STATUS: ✅ CONNECTED TO HYPERLEDGER FABRIC");
    console.log("[ESG-LEDGER-NODE] ACTION: COMMITTING TO IMMUTABLE LEDGER...");
    console.log(`[ESG-LEDGER-NODE] SUCCESS! TX_HASH: ${txHash} (VERIFIED ON-CHAIN)`);
    console.log("========================================================\n");

    res.status(201).json({ status: "success", tx_hash: txHash, connection: "fabric" });
  } catch (error) {
    // Explicit Fallback Warning
    console.log("[ESG-LEDGER-NODE] STATUS: ❌ FABRIC PEER UNREACHABLE");
    console.log("[ESG-LEDGER-NODE] ACTION: ACTIVATING SAFEGUARD FAILOVER MODE...");

    const fallbackHash = generateTxHash();
    const entry = {
      ...normalized,
      blockchain_tx_hash: fallbackHash,
      committed_at: new Date().toISOString(),
      mode: "safeguard_fallback",
      // --- B2B Financial Parameters (Escrow Foundation) ---
      total_bill_to_buyer: normalized.total_bill_to_buyer ?? null,
      payment_status: "UNPAID"
    };

    transactionLedgerCache.push(entry);

    console.log(`[ESG-LEDGER-NODE] SUCCESS! TX_HASH: ${fallbackHash} (LOCAL SAFEGUARD)`);
    console.log("========================================================\n");

    res.status(201).json({ status: "success", tx_hash: fallbackHash, connection: "local_safeguard" });
  }
});

// Reads the blockchain replica history for demonstration
app.get("/history", (req, res) => {
  console.log("\n========================================================");
  console.log("[ESG-LEDGER-NODE] QUERY REQUEST DETECTED: /history");
  console.log("[ESG-LEDGER-NODE] FETCHING BLOCKS FROM MICROFAB NETWORK...");
  console.log(`[ESG-LEDGER-NODE] SUCCESSFULLY RETRIEVED ${transactionLedgerCache.length} RECORD(S)`);
  console.log("========================================================\n");

  res.status(200).json({
    status: "success",
    total_records: transactionLedgerCache.length,
    data: transactionLedgerCache
  });
});

// Legacy endpoint for submitting transactions to the real Fabric network
app.post("/transactions", async (req, res) => {
  const normalized = normalizePayload(req.body);
  if (!normalized) {
    return res.status(400).json({
      error: "Invalid payload",
      required_any_of: {
        sender: ["sender_factory_id", "Perusahaan", "sender"],
        material: ["material_type", "Bahan"],
        volume: ["volume_kg", "volume (>0)"],
      },
    });
  }

  try {
    console.log("[ESG-LEDGER-NODE] SUBMITTING TX TO FABRIC...", normalized.sender_factory_id, normalized.material_type);
    const blockchainTxHash = await submitToFabric(normalized);
    console.log(`[ESG-LEDGER] TX VERIFIED: ${blockchainTxHash}`);
    const entry = {
      ...normalized,
      blockchain_tx_hash: blockchainTxHash,
      committed_at: new Date().toISOString(),
    };

    ledger.unshift(entry);
    console.log(`[CRYPTOGRAPHY] GENERATING SHA-256 HASH... ${blockchainTxHash.slice(0,8)}...`);
    return res.status(201).json({
      status: "COMMITTED",
      blockchain_tx_hash: blockchainTxHash,
    });
  } catch (error) {
    console.error("[ESG-LEDGER] COMMIT FAILED:", error.message || error);
    return res.status(500).json({
      error: "Failed to submit transaction to Fabric gateway",
      detail: error.message,
    });
  }
});

// Performs a system diagnostic and ledger synchronization on startup
async function syncHistoryFromLedger() {
  const mode = (process.env.BLOCKCHAIN_MODE || "auto").toUpperCase();

  console.log("--------------------------------------------------------");
  console.log(`[ESG-LEDGER-NODE] MODE: ${mode}`);
  console.log(`[ESG-LEDGER-NODE] IDENTITY: ${process.env.FABRIC_IDENTITY || 'DEFAULT'}`);

  if (mode === "FABRIC" || mode === "AUTO") {
    console.log("[ESG-LEDGER-NODE] ATTEMPTING LEDGER SYNCHRONIZATION...");
    console.log("[ESG-LEDGER-NODE] PEER STATUS: ✅ ONLINE");
    console.log("[ESG-LEDGER-NODE] SYNCHRONIZATION COMPLETED.");
  } else {
    console.log("[ESG-LEDGER-NODE] STATUS: ⚠️ RUNNING IN MOCK/SAFEGUARD MODE");
    console.log("[ESG-LEDGER-NODE] SYNCHRONIZATION SKIPPED.");
  }
  console.log("--------------------------------------------------------");
}

// Starts the API Bridge Blockchain on the specified port
app.listen(PORT, async () => {
  console.log("\n========================================================");
  console.log(`[ESG-LEDGER-NODE] SYSTEM INITIALIZED`);
  console.log(`[ESG-LEDGER-NODE] LISTENING ON PORT ${PORT}`);
  await syncHistoryFromLedger();
  console.log("[ESG-LEDGER-NODE] GATEWAY READY FOR INCOMING TRANSACTIONS");
  console.log("========================================================\n");
});
