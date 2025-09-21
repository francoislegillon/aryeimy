# AR QR Gallery

A static WebAR experience scaffold built with A-Frame and MindAR. Visitors scan a QR code next to an artwork, the browser opens `/ar/<slug>`, assets are preloaded, and animated overlays render directly on top of the piece.

## Quick start

1. Clone this repository.
2. Serve the project locally with any static server (examples below).
3. Open the served URL on a modern mobile browser and navigate to `/ar/<slug>` (e.g. `/ar/monarch`).

### Using `npx serve`

```bash
npx serve .
```

### Using Python

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Current capabilities

- Device capability detection with a graceful fallback view (force unsupported with `?forceUnsupported=1`).
- Deferred loading of MindAR/A-Frame until a compatible device and manifest are confirmed.
- Manifest-driven preloading with progress UI, retry logic, and overlay ordering.
- APNG/GIF/PNG selection, looping textures, and a lost-target tip that appears after a short delay.
- Non-blocking warning badges for skipped overlays or large payloads.
- Dedicated error view for missing manifests and camera-permission messaging with fallback video links.
- Subtle footer link sourced from the manifest (`aboutLink`).

## Sample artworks

| Slug | Description | Notes |
| ---- | ----------- | ----- |
| `/ar/demo` | Simple dev stub used throughout implementation. | Ships with an SVG overlay and placeholder MindAR descriptor.
| `/ar/monarch` | Monarch butterfly concept with two overlay layers. | Lightweight SVG overlays + text MindAR stub—swap for real assets before launch.
| `/ar/lotus` | Luminous lotus concept with three overlay layers. | Same SVG placeholders; add production assets and fallback video before shipping.

The repository avoids bundling large binaries by using small SVG overlays and text placeholders for `target.mind`. Replace them with production-ready assets when preparing a release.

## Repository layout

- `/ar/<slug>/` – Artwork manifests, MindAR targets, overlays, and fallback videos.
  - Each slug folder ships with an `index.html` bootloader that forwards to the main SPA.
- `/css/` – Global styles for shell, preloader, overlays, and fallback copy.
- `/js/` – Application modules (support detection, routing, manifest fetch, preloader, overlays, entry point).
- `/libs/` – Vendored/stubbed A-Frame and MindAR builds for offline development.
- `/docs/` – Operational playbooks and QR design notes.
- `.github/workflows/` – Continuous validation of manifest JSON.

```text
ar/
  demo/
  monarch/
  lotus/
css/
docs/
js/
libs/
```

## Known limitations

- Overlay art and fallback videos are placeholders; replace them with production assets before launch.
- Vendored MindAR/A-Frame bundles are lightweight stubs—swap them with the official builds prior to release.
- Full device QA (iOS/Android matrix) and QR print validation are still outstanding.

## Asset preparation guidelines

- Provide overlays in **APNG → GIF → PNG** priority. The loader picks the best supported format automatically.
- Keep the combined manifest payload **under 12&nbsp;MB**. A console warning (and UI badge) appears when the budget is exceeded.
- Keep overlay dimensions ≤ **1920px** on the longest edge; the loader logs a warning if files exceed this recommendation.
- Ensure overlays preserve transparency (use premultiplied alpha where possible).
- Include a short `fallback.mp4` per artwork so unsupported devices or denied camera permissions can show an alternative.
- MindAR descriptors (`target.mind`) should be generated from the exact artwork print used on-site.

## Adding a new artwork

1. Duplicate one of the sample folders under `/ar/<slug>/`.
2. Replace `target.mind` with the descriptor generated via MindAR CLI or editor.
3. Export each overlay in APNG/GIF/PNG (at least one static PNG is required) and place them inside `/ar/<slug>/assets/`.
4. Update `manifest.json`:
   - Set `title`, `aboutLink`, and `fallbackVideo`.
   - Provide `position` and `scale` arrays for each overlay (MindAR units).
   - Adjust `zIndex` values for proper stacking order.
5. Copy the bootloader entry page (`/ar/demo/index.html`) into the new slug so QR scans load the SPA instead of a directory listing.
6. Test locally on `/ar/<slug>` and confirm preloader warnings are clear.
7. Commit the folder as part of the static site so GitHub Pages (or any static host) can serve it.

## Deployment (GitHub Pages)

1. Push the repository to GitHub.
2. Enable GitHub Pages (Settings → Pages → Deploy from `main` branch, root directory).
3. Once published, verify the site loads over HTTPS and test `/ar/<slug>` URLs on both iOS Safari and Android Chrome.
4. Update any QR codes to reference the published HTTPS URLs. See [`docs/qr-notes.md`](./docs/qr-notes.md) for design tips.

A GitHub Actions workflow (`.github/workflows/validate.yml`) validates manifest JSON on each push/PR. Extend it with additional checks as needed.

## Vendored libraries

The `/libs` directory contains local copies of the runtime dependencies:

- **A-Frame 1.5.0 (stub)** – swap with the official build before release and record the Subresource Integrity hash.
- **MindAR image tracking (A-Frame build) 1.2.x (stub)** – likewise replace with the upstream bundle and document the hash.

Scripts are now injected dynamically once device support is confirmed, keeping initial payloads small.

## Documentation

- [`developer_spec.md`](./developer_spec.md) – product requirements and architectural context.
- [`prompt_plan.md`](./prompt_plan.md) – original incremental implementation plan.
- [`docs/qr-notes.md`](./docs/qr-notes.md) – QR code production tips for galleries.
- [`docs/ops-playbook.md`](./docs/ops-playbook.md) – repeatable steps for onboarding a new artwork.

## License

Released under the MIT License. See [`LICENSE`](./LICENSE) for details.
