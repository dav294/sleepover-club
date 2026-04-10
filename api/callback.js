// api/callback.js — GitHub OAuth callback
// GitHub redirects here with ?code=... after the user authorises.
// We exchange the code for an access token and post it back to Decap CMS.

module.exports = async function handler(req, res) {
  const { code } = req.query;
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;

  if (!code) {
    res.status(400).send('Missing OAuth code parameter.');
    return;
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },
    body: JSON.stringify({
      client_id:     GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();

  const status  = tokenData.access_token ? 'success' : 'error';
  const payload = tokenData.access_token
    ? JSON.stringify({ token: tokenData.access_token, provider: 'github' })
    : JSON.stringify({ error: tokenData.error || 'OAuth failed' });

  // Decap CMS listens for this exact postMessage format:
  // "authorization:github:success:{...}" or "authorization:github:error:{...}"
  const message = `authorization:github:${status}:${payload}`;

  res.setHeader('Content-Type', 'text/html');
  res.end(`<!DOCTYPE html>
<html>
<body>
<script>
(function () {
  var msg = ${JSON.stringify(message)};
  function receiveMessage(e) {
    window.opener.postMessage(msg, e.origin);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body>
</html>`);
};
