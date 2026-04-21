// api/callback.js — GitHub OAuth callback
// GitHub redirects here with ?code=... after the user authorises.
// We exchange the code for an access token and post it back to Decap CMS.

module.exports = async function handler(req, res) {
  const { code } = req.query;
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;

  // Derive the site origin from the incoming request — same technique used in
  // auth.js. This is used as the hard-coded postMessage targetOrigin so we
  // never send the token to an arbitrary caller-supplied origin.
  const proto        = req.headers['x-forwarded-proto'] || 'https';
  const host         = req.headers['x-forwarded-host']  || req.headers.host;
  const allowedOrigin = `${proto}://${host}`;

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
  var msg         = ${JSON.stringify(message)};
  var targetOrigin = ${JSON.stringify(allowedOrigin)};

  // Send the token only to our own origin — never trust an origin supplied by
  // an incoming message, as that would allow any third-party page to steal the
  // GitHub access token by sending a crafted message first.
  function receiveMessage(e) {
    if (e.origin !== targetOrigin) return;
    window.opener.postMessage(msg, targetOrigin);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', targetOrigin);
})();
</script>
</body>
</html>`);
};
