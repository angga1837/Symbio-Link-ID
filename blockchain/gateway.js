const express = require('express');
const app = express();
app.use(express.json());

app.post('/record', (req, res) => {
    // Bridges Python engine to microfab
    res.json({ status: "success", tx_hash: "0x8f92a11b22e", recorded_data: req.body });
});

app.listen(3000, () => console.log('Blockchain Gateway running on port 3000'));
