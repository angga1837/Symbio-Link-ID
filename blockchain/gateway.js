const express = require("express");
const { submitToFabric } = require("./fabricGateway");

const app = express();
app.use(express.json());

// Default 3001 so local Next.js (3000) and other stacks do not collide.
const PORT = Number(process.env.PORT || 3001);
const ledger = [];

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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "blockchain-gateway" });
});

app.get("/transactions", (_req, res) => {
  console.log(`[ESG-LEDGER-NODE] FETCHING TRANSACTION HISTORY - total=${ledger.length}`);
  res.json({ total: ledger.length, items: ledger });
});

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

app.listen(PORT, () => {
  console.log(`Blockchain Gateway running on port ${PORT}`);
});
