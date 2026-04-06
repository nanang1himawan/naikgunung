const { readDB, writeDB } = require('./_lib/db');
const { verifyAdmin } = require('./_lib/auth');

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET /api/data — Public: baca semua data
    if (req.method === 'GET') {
        try {
            const data = await readDB();
            return res.status(200).json(data);
        } catch (error) {
            console.error('GET /api/data error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // POST /api/data — Admin only: simpan semua data
    if (req.method === 'POST') {
        const auth = verifyAdmin(req);
        if (!auth.valid) {
            return res.status(auth.status).json({ error: auth.error });
        }

        try {
            const newData = req.body;
            await writeDB(newData);
            return res.status(200).json({ success: true, message: 'Data saved successfully' });
        } catch (error) {
            console.error('POST /api/data error:', error);
            return res.status(500).json({ error: 'Failed to save data' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
