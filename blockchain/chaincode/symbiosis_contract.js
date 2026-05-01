'use strict';
const { Contract } = require('fabric-contract-api');

class SymbiosisContract extends Contract {
    async createTransaction(ctx, factoryId, material, volume, purity) {
        const tx = { factoryId, material, volume, purity, docType: 'waste_tx' };
        await ctx.stub.putState(factoryId, Buffer.from(JSON.stringify(tx)));
        return JSON.stringify(tx);
    }
}
module.exports = SymbiosisContract;
