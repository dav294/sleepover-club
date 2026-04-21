// api/cms/upload.js — Image upload proxy
// POST { name, content (base64 data URL payload) } → { path }
//
// Required Vercel env vars:
//   GITHUB_TOKEN        — PAT with repo scope
//   ADMIN_TOKEN_SECRET  — must match the value used in auth.js

const { verifyToken, getBearer } = require('./_token');

const REPO = 'dav294/sleepover-club';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyToken(getBearer(req))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

  const { name, content } = req.body || {};
  if (!name || !content) {
    return res.status(400).json({ error: 'Missing name or content' });
  }

  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const path     = `assets/images/uploads/${Date.now()}-${safeName}`;

  const r = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${ghToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'SleepoverClub-CMS',
      },
      body: JSON.stringify({ message: `Upload: ${name}`, content }),
    }
  );

  if (!r.ok) return res.status(r.status).json({ error: `Upload failed ${r.status}` });
  return res.status(200).json({ path });
};
