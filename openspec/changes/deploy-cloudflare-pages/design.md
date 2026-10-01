## Context

See proposal.md for motivation.

`npm run build` produces a complete static site in `www/`: Angular's output plus the Workbox service worker written by `scripts/build-sw.mjs`. `CLAUDE.md` lists what a host must do: serve over HTTPS, answer unknown paths with `index.html`, and not cache `sw.js`. `scripts/serve-www.mjs` does this locally and is what the production tests run against.

The project is a Git repository on branch `main` with its remote at `github.com:valeriimon/expenses-tracker-web`, and has a `package-lock.json`. It is developed on Node 24. The base href is `/`, and the manifest uses relative `./` paths.

Browser storage belongs to an origin. Cloudflare Pages gives each project the origin `https://<project>.pages.dev`, and gives every individual deployment and every non-production branch a further address of its own, each a separate origin.

## Goals / Non-Goals

**Goals:**

- One permanent address for the app, with a certificate every phone already trusts.
- Publishing a new version is a push to `main`, with nothing to run or remember on this machine.
- The three hosting conditions hold on Cloudflare, and are checked after the first deployment rather than assumed.

**Non-Goals:**

- Moving data from the LAN origin to the new one.
- A test gate in front of deployment, preview deployments as a workflow, a custom domain.
- Running the Playwright production suite against the deployed site: its update tests rewrite the build on disk between steps, which a remote host cannot do.

## Decisions

### Git integration: Cloudflare builds on push to `main`

The Pages project is created in the Cloudflare dashboard by connecting the GitHub repository. Cloudflare's GitHub app is authorised for this one repository only, not the whole account. From then on a push to `main` is a deployment.

Build settings, entered once in the dashboard:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `www` |
| Framework preset | None |

No preset is chosen because the Angular preset assumes `ng build` and `dist/`; this project's build also generates the service worker and writes to `www/`.

Alternative: upload `www/` from this machine with Wrangler. That keeps the published build identical to the locally tested one, but needs a deploy command, a dependency, and a login on every machine that publishes. With the repository already on GitHub, building on push is less to maintain. The trade-off is that the build runs in Cloudflare's environment, which the next two decisions address.

No `wrangler.toml` is added. With Git integration the dashboard holds the settings; a configuration file would become a second source for them.

### Pin Node with `.nvmrc`

A `.nvmrc` containing `24` makes Cloudflare's build image use the major version the project is developed on, and does the same for anyone using `nvm` locally. Without it the image's default Node is used, which changes over time and may be older than this Angular version supports.

Dependencies come from `package-lock.json`, which Cloudflare installs from, so the build uses the same package versions as local builds.

Alternative: a `NODE_VERSION` environment variable in the dashboard. It works, but keeps the version outside the repository.

### No test gate on deployment

The build command only builds. Whatever is on `main` is published, so lint and tests are run before pushing; `CLAUDE.md` says so.

Alternative: put `npm run lint && npm test` in the build command. The unit tests would run in Cloudflare's image on every push, lengthening each deployment and adding a place for environment-specific failures, and the browser suites could still not run there. A GitHub Actions gate is the proper form of this and is left for a later change. A bad deployment is recoverable: users are offered an update, never moved to one, and Pages can roll back.

### Preview deployments are turned off

By default Pages builds every other branch too and publishes it at `https://<branch>.<project>.pages.dev`. Each of those is a separate origin with empty storage. An install made from one would hold its own data and stop receiving updates once the branch is gone.

Nothing in this project uses previews, so the project's branch control is set to deploy the production branch only. Each production deployment still has a per-deployment address in the dashboard; `CLAUDE.md` names the one address to install from.

### Unknown paths: rely on Pages' single-page-application behaviour

When a deployment contains no top-level `404.html`, Pages answers any path that is not a file with `index.html` and status 200. The build has no `404.html`, so nothing is added. A `_redirects` rule (`/* /index.html 200`) would do the same explicitly, but it also catches requests for missing assets and answers them with HTML, which hides a broken build. The default is kept and the behaviour is verified after deploying.

### `sw.js` caching: state it in `_headers`

Pages serves files with `Cache-Control: public, max-age=0, must-revalidate` by default, which already satisfies the condition. A `_headers` file in the build adds:

```
/sw.js
  Cache-Control: no-cache
```

so the condition is in this repository and survives a change of the host's default. The file lives at `src/_headers` and is listed in the build's assets. It has no extension, so the service worker's precache glob does not pick it up, and Pages does not serve it as content.

No long-lived caching is added for the content-hashed scripts. After the first visit the service worker serves every file from its own cache, so the HTTP cache has nothing left to save.

### The LAN preview stays

`npm run preview:lan` remains the way to try an unpublished build on a real phone. `CLAUDE.md` is reworded so that it is described as that, and no longer as the way to use the app.

## Risks / Trade-offs

- [Data already recorded on the phone at the LAN address does not appear at the new address, and there is no export] → Stated to the user before they switch. The original CSV can be imported again at the new address; anything entered by hand since has to be re-entered, or the old install kept until an export exists. The old install keeps working offline for as long as its icon is not removed.
- [Every push to `main` is a release, including unfinished or untested work] → Work that is not ready stays on another branch, which is not deployed. Users are only offered an update, and a deployment can be rolled back.
- [The build fails or differs in Cloudflare's environment] → Node and dependency versions are pinned. A failed build publishes nothing: the previous deployment stays live. The first build is checked against the hosting conditions.
- [The app is installed from a per-deployment address] → Previews are off; `CLAUDE.md` names the one address to install from.
- [The chosen project name is taken] → The name is global across Cloudflare. The user picks another at creation.
- [The built app is public at the address even if the repository is private] → Nothing in the build is secret, and no expense leaves the browser. `certs/` is ignored by Git and is not part of the build.
- [The free plan or Pages itself changes] → The build is host-neutral. Moving hosts changes the origin, which is the case an export is needed for.
- [The Cloudflare side cannot be set up on the user's behalf] → Account, GitHub authorisation, project creation, and installing on the phone are tasks for the user; the repository is prepared first so the first build succeeds.

## Migration Plan

1. Commit and push the repository changes (`.nvmrc`, `_headers`).
2. Create the Pages project from the GitHub repository; the first build deploys.
3. Check the three hosting conditions against the live address.
4. Open the address on the phone, wait for "Ready to use offline", add to the home screen.
5. Import the original CSV if the history is wanted there.
6. Remove the old home-screen icon only once nothing on it is needed: removing it deletes its data.

Rollback: Pages keeps earlier deployments and can make one current again from the dashboard. Users on the newer version are then offered the older one as an update, as with any deploy. Reverting the commit on `main` does the same through a new build.
