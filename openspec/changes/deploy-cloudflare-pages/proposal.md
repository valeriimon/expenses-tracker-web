## Why

The app is only reachable on a phone through `npm run preview:lan`, at the PC's Wi-Fi address. That address is the origin the phone's data belongs to, so a new DHCP lease or port strands every recorded expense; it also needs a self-issued root certificate trusted on the phone, a firewall rule, and the PC switched on to install or update. Hosting the build on Cloudflare Pages gives the app one permanent HTTPS address of its own.

## What Changes

- Connect the GitHub repository (`valeriimon/expenses-tracker-web`) to a Cloudflare Pages project. Cloudflare builds the app and publishes it at `https://<project>.pages.dev` on every push to `main`.
- Pin the Node version the build uses with a `.nvmrc`, so Cloudflare builds with the version the project is developed on.
- Add a `_headers` file to the build stating that `sw.js` is never cached, rather than relying on the host's default.
- Turn off preview deployments for other branches, so the app exists at one address only.
- Document deployment, the production address, and the rule that the app is installed only from that address, in `CLAUDE.md`.
- The LAN HTTPS preview (`npm run cert`, `npm run preview:lan`) stays, for trying a build on a phone before publishing it.

Not in this change:

- Exporting or backing up expenses. Data on the phone at the current LAN address does not move to the new address; see design.md, Risks.
- Running lint or tests as a gate before a deployment.
- A custom domain.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Where the build is served from is not behaviour the specs describe: `offline-install` already states what the app guarantees on any host, and those guarantees are unchanged. The change sets `skip_specs: true`.

## Impact

- New files: `.nvmrc`, `src/_headers`.
- `angular.json`: `_headers` added to the build's assets so it lands in `www/`.
- `CLAUDE.md`: deployment and the hosting section.
- No new dependency and no new script: publishing is `git push` to `main`.
- External: a Cloudflare account and one Pages project on the free plan, and Cloudflare's GitHub app authorised for this repository, all set up by the user. The built app becomes publicly reachable at the project address whether or not the repository is private; recorded expenses stay in each browser and are never uploaded.
- No change to application code, the service worker, or any spec.
