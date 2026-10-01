// Serves the production build in `www/` the way a real host must:
//
// - any path that is not a file answers with index.html, so a deep link such as
//   /settings/categories loads the app;
// - sw.js is never cached by the browser's HTTP cache, so a new deploy is
//   noticed on the next visit.
//
// For local previews and the production-build end-to-end tests only.
//
// With `--https` it serves over HTTPS using the certificate in `certs/`, which
// is what lets a phone on the same network use the app in full: browsers only
// register a service worker — and so only offer offline use and installation —
// on a secure origin, and a LAN address over plain HTTP is not one. See
// `scripts/make-cert.mjs` for where the certificate comes from.
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { networkInterfaces } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

const root = resolve('www');
const port = Number(process.env.PORT ?? 4301);
const secure = process.argv.includes('--https');

const CERT = 'certs/local.pem';
const KEY = 'certs/local-key.pem';

const TYPES = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

function handle(request, response) {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  let file = resolve(join(root, path));

  // Nothing outside the build is served, and anything that is not a file in it
  // is a route for the app to handle.
  const inside = file === root || file.startsWith(root + sep);
  if (!inside || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(root, 'index.html');
  }

  response.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(response);
}

/** This machine's addresses on the local network, which is what a phone opens. */
function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((address) => address.family === 'IPv4' && !address.internal)
    .map((address) => address.address);
}

if (secure && !(existsSync(CERT) && existsSync(KEY))) {
  console.error(`No certificate found at ${CERT}. Run \`npm run cert\` first.`);
  process.exit(1);
}

const server = secure
  ? createHttpsServer({ cert: readFileSync(CERT), key: readFileSync(KEY) }, handle)
  : createHttpServer(handle);

server.listen(port, () => {
  const scheme = secure ? 'https' : 'http';
  console.log(`Serving www/ at ${scheme}://localhost:${port}`);

  if (secure) {
    // Only the addresses the certificate was issued for will be accepted by
    // the phone; if this machine's address has changed, run `npm run cert`.
    for (const address of lanAddresses()) {
      console.log(`  on the network: ${scheme}://${address}:${port}`);
    }
  }
});
