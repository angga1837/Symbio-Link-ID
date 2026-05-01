const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Gateway, Wallets } = require("fabric-network");

/**
 * Uses real Fabric Gateway when credentials are available.
 * Falls back to deterministic hash mode for local/offline runs.
 */
async function submitToFabric(transaction) {
  const mode = process.env.BLOCKCHAIN_MODE || "auto";
  if (mode === "fabric" || mode === "auto") {
    const result = await tryFabricSubmit(transaction);
    if (result) {
      return result;
    }
    if (mode === "fabric") {
      throw new Error("BLOCKCHAIN_MODE=fabric but Fabric connection failed");
    }
  }

  return fallbackHashSubmit(transaction);
}

async function tryFabricSubmit(transaction) {
  const connectionProfilePath = process.env.FABRIC_CONNECTION_PROFILE;
  const walletPath = process.env.FABRIC_WALLET_PATH;
  const identity = process.env.FABRIC_IDENTITY;
  const channelName = process.env.FABRIC_CHANNEL || "mychannel";
  const chaincodeName = process.env.FABRIC_CHAINCODE || "symbiosis";

  if (!connectionProfilePath || !walletPath || !identity) {
    return null;
  }

  if (!fs.existsSync(connectionProfilePath) || !fs.existsSync(walletPath)) {
    return null;
  }

  const gateway = new Gateway();
  try {
    const ccp = JSON.parse(fs.readFileSync(path.resolve(connectionProfilePath), "utf8"));
    const wallet = await Wallets.newFileSystemWallet(path.resolve(walletPath));

    await gateway.connect(ccp, {
      wallet,
      identity,
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);
    const payload = JSON.stringify(transaction);
    const txBuffer = await contract.submitTransaction("CreateTransaction", payload);

    const txString = txBuffer?.toString();
    if (txString) {
      return txString;
    }

    const digest = crypto.createHash("sha256").update(payload).digest("hex");
    return `fabric-${digest.slice(0, 32)}`;
  } finally {
    gateway.disconnect();
  }
}

function fallbackHashSubmit(transaction) {
  const canonical = JSON.stringify(transaction);
  const hash = crypto.createHash("sha256").update(canonical).digest("hex");
  return `fabric-${hash.slice(0, 32)}`;
}

module.exports = {
  submitToFabric,
};
