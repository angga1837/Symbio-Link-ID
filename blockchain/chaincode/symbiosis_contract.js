"use strict";
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
    return JSON.stringify(record);
  }

  async QueryAllTransactions(ctx) {
    const startKey = "";
    const endKey = "";
    const allResults = [];
    for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
      const strValue = Buffer.from(value).toString("utf8");
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        record = strValue;
      }
      allResults.push({ Key: key, Record: record });
    }
    return JSON.stringify(allResults);
  }
}

module.exports = SymbiosisContract;
