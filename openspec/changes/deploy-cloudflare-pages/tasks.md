## 1. Prepare the repository

- [x] 1.1 Add `.nvmrc` containing `24` and verify it matches the major version printed by `node -v`
- [x] 1.2 Add `src/_headers` setting `Cache-Control: no-cache` for `/sw.js`, list it in the build assets in `angular.json`, and verify `npm run build` leaves `www/_headers` with that rule
- [x] 1.3 Verify the build has no top-level `404.html` and that `www/sw.js` does not precache `_headers` (search the generated file)
- [x] 1.4 Verify the build works from a clean install as Cloudflare will run it: `npm ci` then `npm run build` complete without errors
- [x] 1.5 Run `npm run lint`, `npm test`, and `npm run e2e:pwa`, and verify all pass with the extra file in the build
- [ ] 1.6 With the user's go-ahead, commit and push to `main`, and verify `git status` shows the branch up to date with `origin/main`

## 2. Cloudflare project (user steps)

- [ ] 2.1 User: create a Cloudflare account if needed, and in Workers & Pages create a Pages project by connecting GitHub, authorising Cloudflare for the `expenses-tracker-web` repository only
- [ ] 2.2 User: choose the project name and set production branch `main`, framework preset None, build command `npm run build`, output directory `www`; verify the first build finishes and the dashboard shows the `pages.dev` address
- [ ] 2.3 User: in the project's build settings, set branch control to deploy the production branch only, and verify preview deployments are shown as disabled
- [ ] 2.4 Check the first build's log and verify it used Node 24 and installed from the lockfile

## 3. Verify the live site

- [ ] 3.1 Request `https://<project>.pages.dev/settings/categories` and verify status 200 with the app's HTML
- [ ] 3.2 Request `/sw.js` and verify the `Cache-Control` response header is `no-cache`, and that `/manifest.webmanifest` is served as a manifest
- [ ] 3.3 Request a missing asset such as `/missing.js` and record what is returned, so the fallback's effect on broken builds is known
- [ ] 3.4 Open the address in a desktop browser and verify the "Ready to use offline" notice appears, settings report the app as available offline, and it reloads with the network disabled
- [ ] 3.5 Push a second commit to `main` and verify Cloudflare deploys it and the open app offers "An update is ready" and reloads into it

## 4. Phone and documentation

- [ ] 4.1 User: open the production address in Safari on the phone, verify there is no certificate warning, add it to the home screen, and verify it opens offline in aeroplane mode
- [ ] 4.2 Update `CLAUDE.md`: publishing by pushing to `main`, the production address, installing only from that address, running lint and tests before pushing, and `preview:lan` described as a pre-publish check; verify the commands listed match `package.json`
- [ ] 4.3 Run `openspec validate deploy-cloudflare-pages --strict` and verify it passes
