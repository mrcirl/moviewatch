// Custom server instead of `next start` so we can read the true TCP peer
// address for the IP-allowlist auth bypass. We inject it as `x-client-ip`,
// overwriting any client-supplied value of that header so it can't be
// spoofed to fake a trusted IP.
//
// If TRUSTED_PROXY_CIDRS is unset (the default), the socket's direct peer
// address is always used and any incoming X-Forwarded-For is ignored — safe
// for a direct LAN exposure (e.g. a plain Docker port mapping on Unraid).
// If you run behind a reverse proxy, set TRUSTED_PROXY_CIDRS to that proxy's
// address (comma/newline separated CIDRs/IPs, e.g. "172.18.0.0/16" for a
// Docker bridge network) so the real client address from X-Forwarded-For is
// used instead — see README.
const { createServer } = require('node:http');
const next = require('next');
const { normalizeIp, isIpAllowlisted } = require('./lib/net');

const port = parseInt(process.env.PORT || '3000', 10);
const trustedProxyCidrs = (process.env.TRUSTED_PROXY_CIDRS || '').trim();

const app = next({ dev: false });
const handle = app.getRequestHandler();

/**
 * Walks the X-Forwarded-For chain from the hop nearest to us outward,
 * skipping entries that are themselves trusted proxies, and returns the
 * first (nearest) untrusted hop — the real client. Only consulted at all
 * when the direct TCP peer is itself a trusted proxy.
 */
function resolveClientIp(remoteAddress, forwardedForHeader) {
  const remote = normalizeIp(remoteAddress || '');
  if (!trustedProxyCidrs || !isIpAllowlisted(remote, trustedProxyCidrs)) {
    return remote;
  }
  const chain = (forwardedForHeader || '')
    .split(',')
    .map((s) => normalizeIp(s.trim()))
    .filter(Boolean);
  for (let i = chain.length - 1; i >= 0; i--) {
    if (!isIpAllowlisted(chain[i], trustedProxyCidrs)) return chain[i];
  }
  return chain.length ? chain[0] : remote;
}

app.prepare().then(() => {
  createServer((req, res) => {
    const clientIp = resolveClientIp(req.socket.remoteAddress, req.headers['x-forwarded-for']);
    if (clientIp) req.headers['x-client-ip'] = clientIp;
    else delete req.headers['x-client-ip'];
    handle(req, res);
  }).listen(port, '0.0.0.0', () => {
    console.log(`> Ready on port ${port}`);
  });
});
