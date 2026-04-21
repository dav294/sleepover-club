// api/cms/auth.js — Admin password verification
// POST { password } → 200 { token } | 401 { error }
//
// Required Vercel env vars:
//   ADMIN_PASSWORD      — the shared login password
//   ADMIN_TOKEN_SECRET  — random 32+ char string used to sign session tokens

const { createToken } = require('./_token');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured' });
  }

  const { password } = req.body || {};
  if (!password || password !== adminPassword) {
    // Uniform delay to slow brute-force attempts
    await new Promise(r => setTimeout(r, 400));
    return res.status(401).json({ error: 'Incorrect password' });
  }

  try {
    const token = createToken();
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
