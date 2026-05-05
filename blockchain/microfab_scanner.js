const http = require('http');

const endpoints = [
    '/ak/api/v1/components',
    '/api/v1/components',
    '/ak/api/v1/deployments',
    '/ak/api/v1/chaincodes',
    '/ak/api/v1/channels/mychannel/chaincodes',
    '/ak/api/v1/components/org1peer/chaincodes'
];

async function scan() {
    console.log("🔍 Scanning Microfab API Endpoints for Life...");
    console.log("--------------------------------------------------");
    for (const path of endpoints) {
        await new Promise(resolve => {
            // We use POST with empty body to check Method Allowed
            const req = http.request({ 
                hostname: 'localhost', 
                port: 8080, 
                path, 
                method: 'POST',
                headers: { 'Content-Length': 0 }
            }, (res) => {
                const status = res.statusCode;
                let msg = "";
                if (status === 405) msg = "❌ Method Not Allowed";
                else if (status === 404) msg = "❓ Not Found";
                else if (status === 400) msg = "✅ ALIVE (Bad Request means path exists!)";
                else if (status === 411) msg = "✅ ALIVE (Needs Length)";
                else if (status === 201 || status === 200) msg = "⭐ ACTIVE";
                else msg = `Code: ${status}`;
                
                console.log(`Path: ${path.padEnd(40)} | ${msg}`);
                resolve();
            });
            req.on('error', () => {
                console.log(`Path: ${path.padEnd(40)} | 💀 Connection Refused`);
                resolve();
            });
            req.end();
        });
    }
    console.log("--------------------------------------------------");
    console.log("Scan Complete.");
}

scan();
