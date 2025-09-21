
# Prompt Plan for Code‑Generation LLM
**Goal:** Implement a static WebAR site (MindAR + A‑Frame) that opens from a QR and overlays transparent animated layers on a tracked artwork.  
**Approach:** 15 tiny, consecutive prompts. Each prompt specifies files to add/edit, success checks, and cautions. Copy the repo state forward between prompts.

> **Important:** Each prompt assumes the LLM has the full current repo contents. When you use a new prompt, paste back the entire updated file set (or a unified diff) so there is no orphaned code.

---

## P0 — Initialize repo + basic HTML
**Prompt:**  
Create a minimal static site scaffold. Add:
- `index.html` with semantic skeleton (`<head>` with viewport/meta, `<body>` with a central "Hello WebAR" placeholder).
- `/css/style.css` (basic body typography, full‑viewport layout).
- `/js/app.js` (empty module structure with TODO).
- `README.md` with quick start: open in a local server; explain that final hosting will be GitHub Pages.
- `.editorconfig`, `.gitignore` (Node, macOS), and `LICENSE` (MIT).

**Constraints & Best Practices:**
- Accessible HTML (lang attribute, meta charset, meta viewport).
- No external network calls yet.
- Keep CSS minimal and deterministic.

**Deliverable:** Full file contents. Page loads without errors.

---

## P1 — Vendor libraries locally
**Prompt:**  
Add a `/libs/` folder and vendor **A‑Frame** and **MindAR (image + A‑Frame build)** as local files. Update `index.html` to reference local scripts in correct order but **don’t initialize AR yet**.

**Files:**
- `/libs/aframe.min.js`
- `/libs/mindar-image-aframe.prod.js`

**Constraints & Best Practices:**
- Use SRI hashes comments in README to document upstream versions.
- Load scripts with `defer` and in dependency order.

**Deliverable:** `index.html` includes both libs; console clean.

---

## P2 — Capability detection + fallback shell
**Prompt:**  
Implement a capability check and a fallback shell.
- Add `/js/support.js` exporting `detectSupport()` returning flags: `{ isIOS, iOSVersion, isAndroid, hasWebGL, hasCamera, supportsAPNG }`.
- In `index.html`, include a fallback `<div id="fallback">` hidden by default.
- Extend `/js/app.js`: run detection, toggle a CSS class on `<body>`: `supported` vs `unsupported`; if unsupported, render fallback messaging (no AR yet).

**Files to edit:** `index.html`, `/css/style.css`, `/js/support.js`, `/js/app.js`.

**Constraints & Best Practices:**
- Avoid UA sniffing except for iOS version detection; rely on feature detection where possible.
- No camera prompt yet; this is pre‑AR.

**Deliverable:** Two code paths observable by forcing flags in `detectSupport()`.

---

## P3 — Slug routing + manifest fetch
**Prompt:**  
Implement routing for `/ar/<slug>` and manifest loading.
- Add `/js/router.js` with `getSlugFromPath()` reading `location.pathname`.
- Add `/js/manifest.js` with `fetchManifest(slug)` and `validateManifest(json)` (simple schema checks and helpful error messages).
- Extend `/js/app.js`: on supported devices, resolve slug, load manifest, and print title to a placeholder `<div id="title">`.

**Files to edit:** `index.html`, `/js/app.js`, `/js/router.js`, `/js/manifest.js`.

**Constraints & Best Practices:**
- Handle missing slug and 404 gracefully (render error page).
- Use async/await with try/catch; show user‑friendly copy.

**Deliverable:** Visiting `/ar/demo` triggers a fetch to `/ar/demo/manifest.json` and shows the title (mock file is okay for now).

---

## P4 — Preloader module + asset prefetch
**Prompt:**  
Add a preloader that fetches `target.mind` and overlay images/APNG/GIF (from manifest) before starting AR.
- Create `/js/preload.js` exporting `preloadAssets(manifest)` that returns `{ images, targetBuffer }`.
- Add a progress UI (`#preloader`) with a simple progress bar; hide when complete.

**Files to edit:** `index.html` (preloader container), `/css/style.css`, `/js/preload.js`, `/js/app.js`.

**Constraints & Best Practices:**
- Use `Image.decode()` where available; fallback to `onload`.
- One retry per asset on failure; log errors clearly.
- Keep total payload notes in console.

**Deliverable:** Progress bar advances as assets load; errors show a toast or inline message.

---

## P5 — First AR scene boot (no overlays)
**Prompt:**  
Initialize MindAR + A‑Frame scene once preloading succeeds.
- In `index.html`, add `<a-scene>` with `mindar-image="imageTargetSrc: <dynamic>"`, `embedded`, and minimal lighting.
- Add `<a-entity mindar-image-target="targetIndex: 0">` as attachment root.
- Start/stop scene from `/js/app.js` after preloading is done.

**Files to edit:** `index.html`, `/js/app.js`.

**Constraints & Best Practices:**
- Don’t touch overlays yet.
- Ensure camera permission request happens only when we’re about to start AR.

**Deliverable:** Camera view opens and MindAR scene runs; no planes added.

---

## P6 — Single overlay plane
**Prompt:**  
Render the first overlay as a transparent plane.
- Add `/js/overlays.js` with `buildOverlayPlane(overlay, resources)` that returns an A‑Frame `<a-plane>` configured with correct texture, `position`, and `scale` from manifest; z depth small offset.
- In `app.js`, after scene creation, add the first plane to the `mindar-image-target` entity.

**Files to edit:** `/js/overlays.js`, `/js/app.js`.

**Constraints & Best Practices:**
- Use nearest power‑of‑two textures handling if needed; ensure transparency (`alphaTest: 0.001`).
- Keep z offset small (e.g., 0.001).

**Deliverable:** One overlay appears aligned to the target when the artwork is in view.

---

## P7 — Multiple layers + z‑stack ordering
**Prompt:**  
Support N overlays defined in manifest.
- Extend `/js/overlays.js` with `buildOverlays(overlays, resources)` building an array of planes ordered by `zIndex`.
- Update `/js/app.js` to append all planes to the target entity.

**Constraints & Best Practices:**
- Sort by `zIndex`; default to 0.
- Use small incremental z to avoid z‑fighting.

**Deliverable:** Multiple overlays render in proper order.

---

## P8 — Animated bitmap handling (APNG → GIF → PNG)
**Prompt:**  
Add animation support and fallbacks.
- Implement APNG support test (e.g., canvas decode) in `support.js`.
- In `preload.js`, pick the best available URL per overlay (APNG > GIF > PNG).
- Ensure textures update/loop (for GIF/APNG) using `<img>` textures with natural looping.

**Deliverable:** Animated overlays loop automatically; static PNG loads if animation unsupported.

---

## P9 — Target found/lost events + UX polish
**Prompt:**  
Wire `targetFound` / `targetLost` to show/hide overlays smoothly.
- Add CSS fade in/out; add small tip “move closer” after 2–3s of loss.
- Ensure the scene doesn’t show ghost images when target is lost.

**Deliverable:** Clean experience during tracking acquisition/loss.

---

## P10 — Footer “About the artist” link
**Prompt:**  
Add a subtle footer link reading from `manifest.aboutLink`.
- Position bottom‑center, small font, opens in new tab.
- Ensure it doesn’t interfere with AR gestures or iOS Safari bars.

**Deliverable:** Footer appears only in supported AR flow; opens correctly.

---

## P11 — Robust error paths
**Prompt:**  
Harden error handling.
- Manifest 404 → dedicated error view with helpful copy.
- Asset fetch error → retry once, then show a non‑blocking warning badge.
- Camera denied → instructions to enable camera; offer fallback video link if present in manifest.

**Deliverable:** All paths render friendly UI; app never crashes.

---

## P12 — Performance pass
**Prompt:**  
Optimize startup and assets.
- Defer loading of MindAR/A‑Frame until after capability check.
- Document recommended asset sizes; add simple console budget check (warn > 12MB).
- Ensure images are not upscaled; set appropriate texture filtering.

**Deliverable:** Load times reasonable; budget warnings visible in console.

---

## P13 — Add two real demo slugs
**Prompt:**  
Create two sample artworks:
- `/ar/monarch/manifest.json` + assets (use placeholder images).
- `/ar/lotus/manifest.json` + assets.
- Provide tiny `fallback.mp4` stubs.
- Update README with “How to add an artwork” steps.

**Deliverable:** Visiting `/ar/monarch` and `/ar/lotus` works end‑to‑end.

---

## P14 — QR generation notes + GitHub Pages config
**Prompt:**  
- Add `docs/qr-notes.md` with guidance: high‑contrast, center logo, error‑correction level (M/H), URL examples.
- Add a GitHub Pages section in README and sample `/.github/workflows/validate.yml` (optional) that lints JSON manifests (use `jq` or Node script).

**Deliverable:** Repository is ready for publishing; validation workflow optional but present.

---

## P15 — Final cleanup & DoD checklist
**Prompt:**  
- Run through a DoD: no console errors, README updated, two devices per platform tested.
- Produce a final file tree in README; list known limitations (iOS jitter, lighting).

**Deliverable:** Release-ready static site with clear instructions.

---

## General Guidance to Include in Every Prompt
- Return **complete file contents** for any file you modify, not snippets.
- Maintain consistent code style (2‑space indent, semicolons, ES modules where applicable).
- Keep all external files under `/libs/` and never switch to CDN mid‑series.
- Never drop previously created code; if refactoring, provide unified diffs or full replacements.
- Add short comments at top of JS files describing purpose and public functions.
