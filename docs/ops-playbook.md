# Ops Playbook — Adding a New Artwork

Follow these steps when onboarding a new artwork into the AR QR gallery:

1. **Collect assets**
   - High-resolution artwork image for MindAR training.
   - Overlay exports (APNG/GIF/PNG) with transparent backgrounds.
   - Short `fallback.mp4` (10–15 s loop) demonstrating the AR effect.

2. **Generate the MindAR target**
   - Use the MindAR CLI or editor to train a `target.mind` file from the final print.
   - Test the descriptor with the live artwork to confirm stable tracking.

3. **Prepare overlay layers**
   - Export APNG (primary), GIF (fallback), and PNG (static) for each layer.
   - Keep assets ≤ 1920 px on the longest edge and under 12 MB combined.

4. **Create the slug folder**
   - Duplicate `/ar/demo/` (or an existing slug) to `/ar/<slug>/`.
   - Keep the bundled `index.html` bootloader so scanners land on the SPA instead of a directory listing.
   - Replace the placeholder `target.mind` file and swap the SVG overlays in `/assets/` with your production exports.

5. **Author `manifest.json`**
   - Update `title`, `aboutLink`, and `fallbackVideo`.
   - Define each overlay object with `position`, `scale`, `zIndex`, and URLs.
   - Run `jq` (or rely on the GitHub Action) to validate JSON formatting.

6. **Local verification**
   - Serve the repo locally, visit `/ar/<slug>`, and check for warning badges.
   - Confirm the slug loads the AR shell immediately (no raw directory index) when hitting the URL directly or via QR scan.
   - Simulate lost tracking (move artwork out of frame) to ensure tips/warnings behave correctly.

7. **Commit and deploy**
   - Commit the new folder and push to `main`.
   - After GitHub Pages deploys, smoke-test the slug on iOS Safari and Android Chrome.

8. **Generate & distribute QR codes**
   - Produce QR codes per [`docs/qr-notes.md`](./qr-notes.md) and verify scans under gallery lighting.

Keep this playbook with the repository so curators have a repeatable process.
