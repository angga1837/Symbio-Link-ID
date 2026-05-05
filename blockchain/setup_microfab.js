const fs = require('fs');
const http = require('http');
const path = require('path');

const URL = 'http://localhost:8080/ak/api/v1/components';

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error("Failed to parse Microfab JSON. Is it healthy?"));
                }
            });
        }).on('error', reject);
    });
}

async function setup() {
    console.log("🔍 Extracting credentials from Microfab...");
    try {
        const components = await fetchJson(URL);

        // 1. Find Peer & Gateway
        const peer = components.find(c => c.type === 'fabric-peer');
        const gateway = components.find(c => c.type === 'gateway');
        const identity = components.find(c => c.id === 'org1admin');

        if (!peer || !gateway || !identity) {
            console.log("Found types:", components.map(c => c.type));
            throw new Error("Could not find necessary Microfab components. Is it running?");
        }

        // 2. Save Connection Profile
        // We use the gateway component but we might need to adjust it slightly for fabric-network
        fs.writeFileSync('./connection.json', JSON.stringify(gateway, null, 2));
        console.log("✅ Created connection.json");

        // 3. Create Wallet & Identity
        const walletDir = path.join(__dirname, 'wallet');
        if (!fs.existsSync(walletDir)) fs.mkdirSync(walletDir);
        
        const idPath = path.join(walletDir, 'org1admin.id');
        const walletData = {
            version: 1,
            type: 'X.509',
            mspId: identity.msp_id,
            credentials: {
                certificate: Buffer.from(identity.cert, 'base64').toString('utf8'),
                privateKey: Buffer.from(identity.private_key, 'base64').toString('utf8')
            }
        };
        fs.writeFileSync(idPath, JSON.stringify(walletData, null, 2));
        console.log("✅ Created wallet/org1admin.id (Verified Decoding)");

        console.log("\n🚀 Setup Successful! Now run: node gateway.js");
    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

setup();
