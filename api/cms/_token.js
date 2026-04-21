// api/cms/_token.js — shared HMAC-signed session token helpers
// Files prefixed with _ are not treated as Vercel routes.

const crypto = require('crypto');

const EXPIRES_MS = 24 * 60 * 60 * 1000; // 24 hours

function createToken() {
  const secret = process.env.ADMIN_SECRET_TOKEN;
  if (!secret) throw new Error('ADMIN_SECRET_TOKEN env var not set');
  const payload = Buffer.from(JSON.stringify({
    iat: Date.now(),
    exp: Date.now() + EXPIRES_MS,
  })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  const secret = process.env.ADMIN_SECRET_TOKEN;
  if (!secret || !token || typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const payload  = token.slice(0, dot);
  const sig      = token.slice(dot + 1);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  // Use timingSafeEqual to prevent timing attacks; handle length mismatch.
  const sigBuf = Buffer.from(sig,      'ascii');
  const expBuf = Buffer.from(expected, 'ascii');
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof data.exp === 'number' && Date.now() < data.exp;
  } catch {
    return false;
  }
}

function getBearer(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

module.exports = { createToken, verifyToken, getBearer };
