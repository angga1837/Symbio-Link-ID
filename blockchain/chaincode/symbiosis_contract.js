const { Contract } = require("fabric-contract-api");

class SymbiosisContract extends Contract {
  async TransactionExists(ctx, txId) {
    const data = await ctx.stub.getState(txId);
    return data && data.length > 0;
  }

  async CreateTransaction(ctx, payloadJson) {
    const payload = JSON.parse(payloadJson);
    const txId = ctx.stub.getTxID();

    const record = {
      ...payload,
      tx_id: txId,
      committed_at: new Date().toISOString(),
      doc_type: "symbio_tx",
    };

    await ctx.stub.putState(txId, Buffer.from(JSON.stringify(record)));
    return txId;
  }

  async ReadTransaction(ctx, txId) {
    const exists = await this.TransactionExists(ctx, txId);
    if (!exists) {
      throw new Error(`Transaction ${txId} does not exist`);
    }

    const data = await ctx.stub.getState(txId);
    return data.toString();
  }

  async GetAllTransactions(ctx) {
    const iterator = await ctx.stub.getStateByRange("", "");
    const results = [];

    while (true) {
      const item = await iterator.next();
      if (item.value && item.value.value) {
        const raw = item.value.value.toString("utf8");
        try {
          results.push(JSON.parse(raw));
        } catch {
          results.push({ raw });
        }
      }
      if (item.done) {
        await iterator.close();
        break;
      }
    }

    return JSON.stringify(results);
  }
}

module.exports = SymbiosisContract;
