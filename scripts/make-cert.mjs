// Issues the certificate `serve-www.mjs --https` serves with, using mkcert.
//
// The certificate names `localhost` and every address this machine currently
// has on the local network, so the same files work from this machine and from
// a phone on the same Wi-Fi. Run it again if the machine's address changes —
// a certificate is only accepted at the addresses it was issued for.
//
// mkcert signs with a root certificate of its own, created the first time it
// runs. A phone accepts the certificate only once that root is installed and
// trusted on it; this script prints where the root is. Nothing here touches
// this machine's own trust store — that would need `mkcert -install`, and a
// phone does not care whether this machine trusts the root.
//
// The output goes to `certs/`, which is not committed: a private key belongs
// to the machine it was made on.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

const mkcert = process.env.MKCERT ?? 'mkcert';

if (spawnSync(mkcert, ['-version']).error) {
  console.error(
    'mkcert was not found. Install it (on Windows: `winget install FiloSottile.mkcert`),\n' +
      'open a new terminal so it is on the PATH, and run this again.',
  );
  process.exit(1);
}

const addresses = Object.values(networkInterfaces())
  .flat()
  .filter((address) => address.family === 'IPv4' && !address.internal)
  .map((address) => address.address);

mkdirSync('certs', { recursive: true });

execFileSync(
  mkcert,
  ['-cert-file', 'certs/local.pem', '-key-file', 'certs/local-key.pem', 'localhost', ...addresses],
  { stdio: 'inherit' },
);

const caRoot = execFileSync(mkcert, ['-CAROOT'], { encoding: 'utf8' }).trim();

console.log(`
Certificate issued for: localhost, ${addresses.join(', ')}

To use the app from a phone, install and trust mkcert's root certificate on it:
  ${join(caRoot, 'rootCA.pem')}

Send only that file. Never copy rootCA-key.pem anywhere.
Then run \`npm run preview:lan\`.`);
