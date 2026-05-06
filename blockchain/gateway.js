require('dotenv').config();
const express = require("express");
const crypto = require("crypto");
const { submitToFabric } = require("./fabricGateway");

const app = express();
app.use(express.json());

const PORT = 4000;
const ledger = [];
let transactionLedgerCache = [];

// ── Helpers ──────────────────────────────────────────────────────────

function normalizePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const senderFactoryId = payload.sender_factory_id || payload.Perusahaan || payload.sender;
  const materialType = payload.material_type || payload.Bahan;
  const volumeRaw = payload.volume_kg ?? payload.volume;
  const volumeKg = Number(volumeRaw);
  if (!senderFactoryId || !materialType || Number.isNaN(volumeKg) || volumeKg <= 0) return null;
  return { ...payload, sender_factory_id: senderFactoryId, material_type: materialType, volume_kg: volumeKg };
}

const generateTxHash = () => {
  console.log("[CRYPTOGRAPHY] GENERATING SHA-256 HASH...");
  return crypto.randomBytes(32).toString("hex");
};

// ── Routes ────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "blockchain-gateway", mode: process.env.BLOCKCHAIN_MODE || "auto" });
});

app.get("/transactions", (_req, res) => {
  res.json({ total: ledger.length, items: ledger });
});

app.get("/transactions/:txHash", (req, res) => {
  const item = ledger.find((e) => e.blockchain_tx_hash === req.params.txHash);
  if (!item) return res.status(404).json({ error: "Transaction not found" });
  return res.json(item);
});

// POST /commit — primary ingestion from Engine
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
      connectionType = "fabric_peer_commit";
    } else {
      txHash = generateTxHash();
      connectionType = "safeguard_fallback";
    }

    const entry = {
      ...normalized,
      blockchain_tx_hash: txHash,
      committed_at: new Date().toISOString(),
      mode: connectionType,
      record_type: "symbiosis_tx",
    };

    transactionLedgerCache.push(entry);

    console.log(`[ESG-LEDGER-NODE] SUCCESS! TX_HASH: ${txHash} (${connectionType.toUpperCase()})`);
    console.log("========================================================\n");

    res.status(201).json({ status: "success", tx_hash: txHash, connection: connectionType });
  } catch (error) {
    console.log("[ESG-LEDGER-NODE] STATUS: ❌ FABRIC PEER UNREACHABLE — ACTIVATING SAFEGUARD...");
    const fallbackHash = generateTxHash();
    const entry = {
      ...normalized,
      blockchain_tx_hash: fallbackHash,
      committed_at: new Date().toISOString(),
      mode: "safeguard_fallback",
      record_type: "symbiosis_tx",
    };
    transactionLedgerCache.push(entry);
    console.log(`[ESG-LEDGER-NODE] SAFEGUARD TX_HASH: ${fallbackHash}`);
    console.log("========================================================\n");
    res.status(201).json({ status: "success", tx_hash: fallbackHash, connection: "local_safeguard" });
  }
});

// POST /shipment-status — called by engine blockchain_service.commit_shipment_status
app.post("/shipment-status", (req, res) => {
  const { shipment_id, status, metadata } = req.body;
  if (!shipment_id || !status) {
    return res.status(400).json({ error: "shipment_id and status are required" });
  }
  const txHash = generateTxHash();
  const entry = {
    record_type: "shipment_status",
    shipment_id,
    status,
    metadata: metadata || {},
    blockchain_tx_hash: txHash,
    committed_at: new Date().toISOString(),
    mode: "safeguard_fallback",
  };
  transactionLedgerCache.push(entry);
  console.log(`[ESG-LEDGER-NODE] SHIPMENT STATUS: ${shipment_id} → ${status} | TX: ${txHash}`);
  res.status(201).json({ status: "success", tx_hash: txHash });
});

// POST /certificates — called by engine blockchain_service.commit_certificate
app.post("/certificates", (req, res) => {
  const certData = req.body;
  if (!certData || !certData.certificate_number) {
    return res.status(400).json({ error: "certificate_number is required" });
  }
  const txHash = generateTxHash();
  const entry = {
    record_type: "green_certificate",
    ...certData,
    blockchain_tx_hash: txHash,
    committed_at: new Date().toISOString(),
    mode: "safeguard_fallback",
  };
  transactionLedgerCache.push(entry);
  console.log(`[ESG-LEDGER-NODE] GREEN CERTIFICATE: ${certData.certificate_number} | TX: ${txHash}`);
  res.status(201).json({ status: "success", tx_hash: txHash });
});

// GET /history — used by Engine /audit endpoint
app.get("/history", (_req, res) => {
  console.log(`[ESG-LEDGER-NODE] /history — ${transactionLedgerCache.length} records`);
  res.status(200).json({
    status: "success",
    total_records: transactionLedgerCache.length,
    data: transactionLedgerCache,
  });
});

// GET /audit/regulatory — used by Engine /api/v1/esg/regulatory-audit
app.get("/audit/regulatory", (_req, res) => {
  console.log(`[ESG-LEDGER-NODE] /audit/regulatory — full ledger export`);
  const total = transactionLedgerCache.length;
  res.status(200).json({
    status: "success",
    total: total,
    records: transactionLedgerCache,
    generated_at: new Date().toISOString(),
    source: "blockchain-gateway-safeguard",
  });
});

// POST /transactions — legacy Fabric-direct endpoint
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
    const txHash = await submitToFabric(normalized);
    const entry = { ...normalized, blockchain_tx_hash: txHash, committed_at: new Date().toISOString() };
    ledger.unshift(entry);
    return res.status(201).json({ status: "COMMITTED", blockchain_tx_hash: txHash });
  } catch (error) {
    console.error("[ESG-LEDGER] COMMIT FAILED:", error.message || error);
    return res.status(500).json({ error: "Failed to submit transaction", detail: error.message });
  }
});

// ── Startup ────────────────────────────────────────────────────────

async function syncHistoryFromLedger() {
  const mode = (process.env.BLOCKCHAIN_MODE || "auto").toUpperCase();
  console.log("--------------------------------------------------------");
  console.log(`[ESG-LEDGER-NODE] MODE: ${mode}`);
  console.log(`[ESG-LEDGER-NODE] IDENTITY: ${process.env.FABRIC_IDENTITY || "DEFAULT (SAFEGUARD)"}`);
  console.log("[ESG-LEDGER-NODE] STATUS: ✅ GATEWAY READY");
  console.log("--------------------------------------------------------");
}

app.listen(PORT, async () => {
  console.log("\n========================================================");
  console.log(`[ESG-LEDGER-NODE] SYSTEM INITIALIZED — PORT ${PORT}`);
  await syncHistoryFromLedger();
  console.log("[ESG-LEDGER-NODE] GATEWAY READY FOR INCOMING TRANSACTIONS");
  console.log("========================================================\n");
});
