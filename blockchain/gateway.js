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
  res.json({ total: ledger.length, items: ledger });
});

app.get("/transactions/:txHash", (req, res) => {
  const item = ledger.find((entry) => entry.blockchain_tx_hash === req.params.txHash);
  if (!item) {
    return res.status(404).json({ error: "Transaction not found" });
  }
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

app.listen(PORT, () => {
  console.log(`Blockchain Gateway running on port ${PORT}`);
});
