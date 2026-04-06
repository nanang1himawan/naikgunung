const path = require('path');

// Load .env file jika tersedia
try {
    require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
} catch (e) {}

const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'kamprent_admin_secret_123';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '21436587admin';

function verifyAdmin(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return { valid: false, status: 401, error: 'No token provided' };
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded.role === 'admin') {
            return { valid: true };
        }
        return { valid: false, status: 403, error: 'Unauthorized' };
    } catch (err) {
        return { valid: false, status: 401, error: 'Invalid token' };
    }
}

function createToken() {
    return jwt.sign({ role: 'admin' }, SECRET_KEY, { expiresIn: '24h' });
}

module.exports = { verifyAdmin, createToken, ADMIN_PASSWORD };
