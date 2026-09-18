# Insplit product website

The public homepage is `/`. Administrator sign-in is `/ad/login`, and the dashboard
is `/ad`. All management pages live under `/ad/*`. The public site contains no admin link; old top-level admin URLs return to the homepage. Authentication remains required.

## Design and content

The product page uses Insplit's mobile dark-theme colors: navy `#0B1020`, cards
`#151C2F`, and lavender `#8EA2FF`. It showcases actual Android captures from
`docs/screenshots`, copied without editing to `web/public/screenshots`.
The gallery notes that these captures are from an earlier release.
The hero's screen selector lets visitors preview expenses, settlements, and inventory.
Minotes and Flipclock appear in a compact maker section with their GitHub links.

Content: `web/src/pages/Showcase.tsx`. Responsive styles: `Showcase.css` in the
same folder. Styles are scoped to `.lp` to preserve the administrator interface.

## Run and deploy

From `web`, use `npm run dev` for preview and `npm run build` for production.
The existing Netlify configuration publishes `web/dist`. For Vercel, use `web`
as the project root, Vite as the framework, and `dist` as the output directory.

## Downloads

The page selects the newest public, non-prerelease `android-v*` GitHub release
with an APK attached. Unfinished releases without APKs are skipped. If the API
is unreachable or rate-limited, download buttons open the repository's Releases
page. No GitHub credentials are shipped to the browser.

Optionally set `VITE_ANDROID_DOWNLOAD_URL` to an HTTPS APK URL in your hosting
build environment and rebuild to use a custom download host.
