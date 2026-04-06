const path = require('path');

// Load .env file jika tersedia (untuk local dev dan Vercel deployment)
try {
    require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
} catch (e) {
    // dotenv tidak tersedia, pakai env vars dari Vercel dashboard
}

const { createClient } = require('redis');
const fs = require('fs');

let client = null;

async function getRedisClient() {
    if (!process.env.REDIS_URL) {
        throw new Error('REDIS_URL environment variable is not set!');
    }

    if (!client) {
        client = createClient({
            url: process.env.REDIS_URL,
            socket: {
                connectTimeout: 10000,
                reconnectStrategy: (retries) => {
                    if (retries > 3) return new Error('Max retries reached');
                    return Math.min(retries * 200, 2000);
                }
            }
        });
        client.on('error', (err) => console.error('Redis Client Error:', err));
    }

    if (!client.isOpen) {
        await client.connect();
    }

    return client;
}

async function readDB() {
    try {
        const redis = await getRedisClient();
        const rawData = await redis.get('camprent_data');
        if (rawData) {
            return JSON.parse(rawData);
        }

        // Redis kosong — seed dari db.json
        console.log("Redis kosong, seeding dari db.json...");
        const dbFile = path.join(__dirname, '..', '..', 'data', 'db.json');
        if (fs.existsSync(dbFile)) {
            const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
            await redis.set('camprent_data', JSON.stringify(data));
            return data;
        }

        // Fallback jika db.json juga tidak ada
        console.warn("db.json tidak ditemukan, return data kosong");
        return { inventory: {}, participants: [] };
    } catch (error) {
        console.error("Error reading DB:", error);
        throw error; // Re-throw agar caller bisa handle
    }
}

async function writeDB(data) {
    try {
        const redis = await getRedisClient();
        await redis.set('camprent_data', JSON.stringify(data));
    } catch (error) {
        console.error("Error writing DB:", error);
        throw error;
    }
}

module.exports = { readDB, writeDB };
