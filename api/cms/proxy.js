// api/cms/proxy.js — GitHub file read / write proxy
// GitHub credentials never leave the server.
//
// GET  ?path=data/events.json        → { data, sha }
// PUT  { path, data, sha, message }  → { sha }
//
// Required Vercel env vars:
//   GITHUB_TOKEN        — PAT with repo scope (never sent to browser)
//   ADMIN_TOKEN_SECRET  — must match the value used in auth.js

const { verifyToken, getBearer } = require('./_token');

const REPO   = 'dav294/sleepover-club';
const BRANCH = 'main';

function ghHeaders(token) {
  return {
    Authorization: `token ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SleepoverClub-CMS',
  };
}

module.exports = async function handler(req, res) {
  if (!verifyToken(getBearer(req))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

  // ── READ ─────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: 'Missing path query param' });

    const r = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${path}`,
      { headers: ghHeaders(ghToken) }
    );
    if (!r.ok) return res.status(r.status).json({ error: `GitHub error ${r.status}` });

    const j    = await r.json();
    const text = Buffer.from(j.content.replace(/\n/g, ''), 'base64').toString('utf8');
    return res.status(200).json({ data: JSON.parse(text), sha: j.sha });
  }

  // ── WRITE ────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { path, data, sha, message } = req.body || {};
    if (!path || data === undefined || !message) {
      return res.status(400).json({ error: 'Missing required fields: path, data, message' });
    }

    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const body    = { message, content, branch: BRANCH };
    if (sha) body.sha = sha;

    const r = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${path}`,
      { method: 'PUT', headers: ghHeaders(ghToken), body: JSON.stringify(body) }
    );
    if (!r.ok) return res.status(r.status).json({ error: `GitHub error ${r.status}` });

    const j = await r.json();
    return res.status(200).json({ sha: j.content.sha });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
