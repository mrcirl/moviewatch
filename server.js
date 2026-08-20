// Custom server instead of `next start` so we can read the true TCP peer
// address for the IP-allowlist auth bypass. We inject it as `x-client-ip`,
// overwriting any client-supplied value of that header so it can't be
// spoofed to fake a trusted IP.
//
// Note: if this app sits behind a reverse proxy, the socket address seen
// here is the proxy's address, not the original client's — the IP allowlist
// feature is intended for direct LAN exposure (e.g. a plain Docker port
// mapping on Unraid), not a proxied deployment.
const { createServer } = require('node:http');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const remote = req.socket.remoteAddress;
    if (remote) req.headers['x-client-ip'] = remote;
    else delete req.headers['x-client-ip'];
    handle(req, res);
  }).listen(port, '0.0.0.0', () => {
    console.log(`> Ready on port ${port}`);
  });
});
