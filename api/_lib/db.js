const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

let client = null;

async function getRedisClient() {
    if (!client) {
        client = createClient({
            url: process.env.REDIS_URL
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
        const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        await redis.set('camprent_data', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error("Error reading DB:", error);
        return { inventory: {}, participants: [] };
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
