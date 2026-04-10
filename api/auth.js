// api/auth.js — GitHub OAuth initiation
// Decap CMS opens this URL in a popup to start the OAuth flow.

module.exports = function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    res.status(500).send('GITHUB_CLIENT_ID environment variable is not set.');
    return;
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${proto}://${host}/api/callback`;

  const params = new URLSearchParams({
    client_id:    clientId,
    scope:        'repo',
    redirect_uri: redirectUri,
  });

  res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
};
