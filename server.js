require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const SECRET_KEY = process.env.JWT_SECRET || 'kamprent_admin_secret_123';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '21436587admin';

// Init Redis
const client = createClient({
    url: process.env.REDIS_URL
});
client.on('error', (err) => console.log('Redis Client Error', err));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read DB (Async for Redis)
const readDB = async () => {
    try {
        const rawData = await client.get('camprent_data');
        if (rawData) {
            return JSON.parse(rawData);
        } else {
            console.log("Redis kosong, membaca data awal dari db.json...");
            const data = fs.readFileSync(DB_FILE, 'utf8');
            const parsed = JSON.parse(data);
            await client.set('camprent_data', JSON.stringify(parsed));
            return parsed;
        }
    } catch (error) {
        console.error("Error reading DB:", error);
        return { inventory: {}, participants: [] };
    }
};

// Helper to write DB (Async for Redis)
const writeDB = async (data) => {
    try {
        await client.set('camprent_data', JSON.stringify(data));
        
        // Tetap tulis ke db.json untuk backup jika server lokal
        if(fs.existsSync(DB_FILE)) {
             fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
        }
    } catch (error) {
        console.error("Error writing DB:", error);
    }
};

// Middleware verify admin token
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Unauthorized' });
        }
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// --- API ENDPOINTS ---

// 1. GET DATA (Public) - All users can view
app.get('/api/data', async (req, res) => {
    const data = await readDB();
    res.json(data);
});

// 2. ADMIN LOGIN
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, error: 'Password salah' });
    }
});

// 3. SAVE ENTIRE STATE (Admin Only) - Inventory, new participants, lunas, dll.
app.post('/api/data', verifyAdmin, async (req, res) => {
    const newData = req.body; // Expects { inventory, participants }
    await writeDB(newData);
    res.json({ success: true, message: 'Data saved successfully' });
});

// 4. UPDATE RENTALS (Public) - Allow users to add/remove their rented items
app.post('/api/update-rentals', async (req, res) => {
    const { userId, rentals } = req.body;
    const data = await readDB();
    
    const userIndex = data.participants.findIndex(p => p.id === userId);
    if (userIndex !== -1) {
        // Blokir jika sudah lunas
        if (data.participants[userIndex].isPaid) {
            return res.status(403).json({ success: false, error: 'Peserta sudah lunas, barang tidak dapat diubah oleh publik.' });
        }
        data.participants[userIndex].rentals = rentals;
        await writeDB(data);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, error: 'User not found' });
    }
});

// Start server setelah connect Redis
client.connect().then(() => {
    console.log("Connected to Redis!");
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch(console.error);
