const express = require("express");
const crypto = require("crypto");
const { submitToFabric } = require("./fabricGateway");

const app = express();
app.use(express.json());

// Set port to 4000 as requested for the blockchain bridge
const PORT = 4000;
const ledger = [];

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
  return crypto.randomBytes(32).toString("hex");
};

// Provides service health status check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "blockchain-gateway" });
});

// Retrieves all stored transactions in the local ledger
app.get("/transactions", (_req, res) => {
  res.json({ total: ledger.length, items: ledger });
});

// Retrieves a specific transaction by its hash
app.get("/transactions/:txHash", (req, res) => {
  const item = ledger.find((entry) => entry.blockchain_tx_hash === req.params.txHash);
  if (!item) {
    return res.status(404).json({ error: "Transaction not found" });
  }
  return res.json(item);
});

// Processes and commits data from the Engine to the blockchain (simulated)
app.post("/commit", (req, res) => {
  console.log("[fabric-network SDK] Connecting to Microfab...");
  console.log("[Gateway] Received JSON from Engine:", req.body);
  
  const txHash = generateTxHash();
  console.log(`[fabric-network SDK] Transaction simulation successful. tx_hash: ${txHash}`);
  
  res.status(201).json({ status: "success", tx_hash: txHash });
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
    const blockchainTxHash = await submitToFabric(normalized);
    const entry = {
      ...normalized,
      blockchain_tx_hash: blockchainTxHash,
      committed_at: new Date().toISOString(),
    };

    ledger.unshift(entry);
    return res.status(201).json({
      status: "COMMITTED",
      blockchain_tx_hash: blockchainTxHash,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to submit transaction to Fabric gateway",
      detail: error.message,
    });
  }
});

// Starts the API Bridge Blockchain on the specified port
app.listen(PORT, () => {
  console.log(`API Bridge Blockchain active on port ${PORT}`);
});
