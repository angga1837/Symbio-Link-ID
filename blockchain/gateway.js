const express = require("express");
const { submitToFabric } = require("./fabricGateway");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ledger = [];

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
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const senderFactoryId = payload.sender_factory_id || payload.Perusahaan || payload.sender;
  const materialType = payload.material_type || payload.Bahan;
  const volumeKg = payload.volume_kg || payload.volume;

  if (!senderFactoryId || !materialType || !volumeKg) {
    return res.status(400).json({
      error: "Invalid payload",
      required_any_of: {
        sender: ["sender_factory_id", "Perusahaan", "sender"],
        material: ["material_type", "Bahan"],
        volume: ["volume_kg", "volume"],
      },
    });
  }

  const normalizedPayload = {
    ...payload,
    sender_factory_id: senderFactoryId,
    material_type: materialType,
    volume_kg: Number(volumeKg),
  };

  try {
    const blockchainTxHash = await submitToFabric(normalizedPayload);
    const item = {
      ...normalizedPayload,
      blockchain_tx_hash: blockchainTxHash,
      committed_at: new Date().toISOString(),
    };

    ledger.unshift(item);
    res.status(201).json({
      status: "COMMITTED",
      blockchain_tx_hash: blockchainTxHash,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to submit transaction to Fabric gateway",
      detail: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Blockchain gateway listening on port ${PORT}`);
});
