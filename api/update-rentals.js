const { readDB, writeDB } = require('./_lib/db');

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId, rentals } = req.body;
        const data = await readDB();

        const userIndex = data.participants.findIndex(p => p.id === userId);
        if (userIndex !== -1) {
            // Blokir jika sudah lunas
            if (data.participants[userIndex].isPaid) {
                return res.status(403).json({
                    success: false,
                    error: 'Peserta sudah lunas, barang tidak dapat diubah oleh publik.'
                });
            }
            data.participants[userIndex].rentals = rentals;
            await writeDB(data);
            return res.status(200).json({ success: true });
        } else {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        console.error('POST /api/update-rentals error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
