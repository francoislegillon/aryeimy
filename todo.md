# WebAR QR Artwork — TODO Checklist

> Use this as a practical, end‑to‑end checklist to ship the static WebAR experience (MindAR + A‑Frame) that opens from a QR and overlays transparent animated layers on a tracked artwork. Target iPhone 8+ (iOS 15+) and Android 9+. Host on GitHub Pages.

---

## 0) Success Criteria
- [ ] **Scan → AR:** Scanning the QR opens full‑screen camera; the artwork is tracked; overlays loop automatically.
- [ ] **Simplicity:** No extra pages; only a subtle “About the artist” footer link.
- [ ] **Static hosting:** All files are static; no server code.
- [ ] **Open‑source libs:** MindAR + A‑Frame vendored locally.
- [ ] **Fallback:** Unsupported devices get a short demo video and clear message.
- [ ] **Two artworks live:** Two real slugs work end‑to‑end.
- [ ] **No console errors;** payload within agreed budget (≤ 8–12 MB/artwork).

---

## 1) Repo Scaffold
- [ ] Create repo with MIT license.
- [ ] Add `.gitignore` (Node/macOS) and `.editorconfig`.
- [ ] `index.html` basic skeleton (lang/meta/viewport).
- [ ] `/css/style.css` base layout (full‑viewport), typography, utility classes.
- [ ] `/js/app.js` (entry), module pattern + high‑level TODOs.
- [ ] `README.md` with quick start (local server), hosting plan (GitHub Pages).

**Accept:** Loads on mobile/desktop without errors.

---

## 2) Vendor Libraries Locally
- [ ] Add `/libs/aframe.min.js` (pin version in README).
- [ ] Add `/libs/mindar-image-aframe.prod.js` (pin version in README).
- [ ] Reference libs in `index.html` with `defer` in the correct order.
- [ ] Document upstream SRI/version notes in README.

**Accept:** Console clean; no AR started yet.

---

## 3) Capability Detection & Fallback Shell
- [ ] `/js/support.js` with `detectSupport()` → `{ isIOS, iOSVersion, isAndroid, hasWebGL, hasCamera, supportsAPNG }`.
- [ ] Add `<div id="fallback">` (hidden by default) in `index.html`.
- [ ] Toggle `<body>` class `supported`/`unsupported` in `/js/app.js`.
- [ ] Fallback copy explaining camera usage and a placeholder for fallback video.

**Accept:** Force flags to see both paths render.

---

## 4) Slug Routing & Manifest Loading
- [ ] `/js/router.js` with `getSlugFromPath()` for `/ar/<slug>`.
- [ ] `/js/manifest.js` with `fetchManifest(slug)` and `validateManifest(json)`.
- [ ] Show manifest `title` in a placeholder (no AR yet).
- [ ] Graceful error view for missing slug or 404 manifest.

**Accept:** `/ar/demo` attempts to load `/ar/demo/manifest.json`; errors handled.

---

## 5) Preloader & Asset Prefetch
- [ ] `/js/preload.js` with `preloadAssets(manifest)` returning `{ images, targetBuffer }`.
- [ ] Progress UI `#preloader` (bar + %).
- [ ] One retry on failed asset; log warnings.
- [ ] APNG test to choose APNG > GIF > PNG (fallback path only selected here).

**Accept:** Progress updates as assets load; broken asset shows warning but continues.

---

## 6) First AR Scene Boot (No Overlays)
- [ ] Add `<a-scene>` configured for MindAR image tracking.
- [ ] Reference `imageTargetSrc` dynamically (from manifest target).
- [ ] Add `<a-entity mindar-image-target="targetIndex: 0" id="targetRoot">`.
- [ ] Start scene only after preloading is complete.

**Accept:** Camera opens; MindAR runs; no planes yet.

---

## 7) Single Overlay Plane
- [ ] `/js/overlays.js` with `buildOverlayPlane(overlay, resources)` (transparent texture, `alphaTest` small).
- [ ] Add first overlay as `<a-plane>` under `#targetRoot` with position/scale/z from manifest.
- [ ] Auto‑show on `targetFound`, hide on `targetLost`.

**Accept:** First overlay appears aligned to artwork and hides when target lost.

---

## 8) Multiple Layers & Z‑Order
- [ ] `buildOverlays(overlays, resources)` to build N planes sorted by `zIndex`.
- [ ] Small positive z increments (e.g., `0.001 * order`) to avoid z‑fighting.
- [ ] Add/remove planes based on manifest content.

**Accept:** Two+ overlays render in correct order.

---

## 9) Animated Bitmaps (APNG → GIF → PNG)
- [ ] Confirm APNG support via `supportsAPNG` (canvas decode method).
- [ ] Select best URL per overlay (APNG > GIF > PNG) in preloader.
- [ ] Ensure looping via natural `<img>` behavior; verify transparency is preserved.

**Accept:** Animated overlays loop; static PNG used if no animation supported.

---

## 10) Target Found/Lost UX Polish
- [ ] Listen for `targetFound` / `targetLost` events.
- [ ] Add CSS fade‑in/out transitions for planes.
- [ ] After 2–3s lost, show small tip (“move closer / better light”).

**Accept:** Clean acquisition/loss behavior; no ghosting.

---

## 11) Footer “About the Artist” Link
- [ ] Read `aboutLink` from manifest.
- [ ] Render a subtle fixed footer link; `target="_blank" rel="noopener"`.
- [ ] Ensure it does not interfere with AR gestures or iOS toolbars.

**Accept:** Link is tappable; no layout shift.

---

## 12) Robust Error Handling
- [ ] Manifest 404 → dedicated error page with back/home link.
- [ ] Asset fetch fail → one retry; then a non‑blocking warning badge/toast.
- [ ] Camera denied → instructions to enable camera; show fallback video (if `fallbackVideo` present).

**Accept:** All error paths are user‑friendly and non‑crashing.

---

## 13) Performance Pass
- [ ] Defer loading MindAR/A‑Frame until after capability checks pass.
- [ ] Console budget check: warn if assets > 12MB/artwork.
- [ ] Ensure image dimensions sensible (≤ 1920px longest side); avoid upscaling.
- [ ] Texture filtering sane defaults; no unnecessary reflows.

**Accept:** TTI ≈ 2–3s Wi‑Fi; 5–7s 4G (for typical payloads).

---

## 14) Add Two Real Demo Artworks
- [ ] `/ar/monarch/manifest.json`, `target.mind`, `assets/` (APNG/GIF/PNG), `fallback.mp4`.
- [ ] `/ar/lotus/manifest.json`, `target.mind`, `assets/` (APNG/GIF/PNG), `fallback.mp4`.
- [ ] README: “How to add a new artwork” (step‑by‑step).

**Accept:** `/ar/monarch` and `/ar/lotus` work end‑to‑end on iOS + Android.

---

## 15) QR Codes & Hosting
- [ ] `docs/qr-notes.md` (error‑correction level M/H, high‑contrast, center logo, quiet zone).
- [ ] Generate QRs pointing to `/ar/<slug>` and verify scan UX.
- [ ] Enable GitHub Pages; verify HTTPS and mobile caching.
- [ ] (Optional) GitHub Actions to validate manifests (lint JSON, existence checks).

**Accept:** QR scans open correct slugs; site loads via HTTPS on phones.

---

## 16) Test Matrix (run and check off)
**Devices (minimum):**
- [ ] iPhone 8 (iOS 15+)
- [ ] iPhone 12/13
- [ ] Recent iPhone (14/15)
- [ ] Android: Pixel 4/6
- [ ] Android: Samsung S10/S21

**Scenarios:**
- [ ] Happy path: QR → AR → overlays loop.
- [ ] Slow 4G throttling.
- [ ] Fallback path (force unsupported flags).
- [ ] Camera permission denied then allowed.
- [ ] Manifest missing.
- [ ] Missing overlay asset (404).
- [ ] Tracking loss (low light, angle, distance).

**Environment:**
- [ ] Good indoor light.
- [ ] Dim gallery light.
- [ ] Target at 0.3–1.5 m distance.

**Acceptance:** All checked scenarios behave as specified; no uncaught errors.

---

## 17) Documentation
- [ ] Update `README.md`: setup, develop, deploy, add artwork.
- [ ] Add `docs/qr-notes.md` with QR guidance and samples.
- [ ] Add `docs/ops-playbook.md`: steps for adding a new slug (target generation, overlays, manifest).

**Accept:** Someone new can add an artwork without help.

---

## 18) Release — Definition of Done
- [ ] No console errors.
- [ ] Two iPhones + two Androids tested.
- [ ] Payload within budget.
- [ ] Fallback video plays on unsupported devices.
- [ ] All acceptance criteria in sections 0–17 met.
- [ ] Tags/release notes pushed.

---

## 19) Maintenance
- [ ] Pin library versions; document upgrade path.
- [ ] Add issue template for “new artwork request” (manifest + assets checklist).
- [ ] Back up `/ar/<slug>/` folders (GitHub Repo as source of truth).

---

## 20) (Optional) Future Extensions (not in current scope)
- [ ] Audio overlays (ambient/narration).
- [ ] Sequenced timelines (staged animations).
- [ ] Artist self‑service portal.
- [ ] Advanced 3D models / occlusion.
- [ ] Offline caching for poor connectivity venues.
