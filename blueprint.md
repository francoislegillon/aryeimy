
# WebAR QR Artwork – Implementation Blueprint

**Objective**: Ship a static, open‑source, MindAR + A‑Frame WebAR page that opens directly from a QR code and overlays transparent animated layers on top of a tracked artwork image. Host on GitHub Pages. Target iPhone 8+ (iOS 15+) and Android 9+ (Chrome).

---

## 1) Success Criteria & Constraints

| Area | Requirement |
|---|---|
| UX | Scan QR → camera view opens → artwork is tracked → overlays loop automatically; minimal chrome with one “About the artist” link. |
| Platform | Web-only, no app. Open-source stack. Static hosting. |
| Tracking | Image tracking of the **artwork area only** (not frame/mat). |
| Media | PNG (static), APNG preferred for animation with GIF fallback, transparent layers on top of physical piece. |
| Loading | Preload **all** assets before AR starts; show lightweight splash (1–2s typical). |
| Devices | iOS 15+ (iPhone 8+), Android 9+. Graceful fallback video for unsupported devices. |
| URLs | One permanent URL per artwork: `https://domain/ar/<slug>`; QR codes point here. |
| Ops | No artist portal. Content is static files + manifest per artwork. |

---

## 2) High-Level Architecture

```
Browser (Safari/Chrome)
 ├─ index.html (A‑Frame scene + MindAR integration)
 ├─ /libs/ (mindar*.js, aframe*.js)
 ├─ /ar/<slug>/manifest.json  ← per-artwork config
 ├─ /ar/<slug>/target.mind    ← MindAR image descriptor
 ├─ /ar/<slug>/assets/*.png|apng|gif|mp4  ← overlays + fallback video
 └─ /css/*.css, /js/*.js (preloader, capability checks, layer builder)
```

**Runtime flow**  
1) Read `<slug>` from URL.  
2) Fetch `/ar/<slug>/manifest.json`.  
3) Capability checks (device/browser). If unsupported → show fallback video page.  
4) Preload `target.mind` + all overlay assets (APNG first, fall back to GIF if APNG unsupported).  
5) Boot MindAR + A‑Frame; start camera; attach planes for each overlay.  
6) Position/scale overlays relative to target plane; loop animations.  
7) Render subtle footer link (“About the artist”).

---

## 3) Versions & Tooling

| Component | Version/Notes |
|---|---|
| MindAR | Latest stable (`mindar-image-three.prod.js` or `mindar-image-aframe.js`). Prefer A‑Frame build. |
| A‑Frame | Latest stable 1.5+ |
| Node | Only for local dev server (optional). Final site is static. |
| GitHub Pages | Main hosting target. |

Pin specific CDN or vendored copies in `/libs/` to avoid upstream surprises.

---

## 4) Asset Pipeline

### 4.1 Target generation
- Source: high-res crop of the actual artwork (no frame/mat).  
- Use MindAR CLI or online tool to generate `target.mind`.  
- Validate tracking score; adjust crop/contrast as needed.

### 4.2 Overlay assets
- Prefer **APNG** for smooth alpha animation; produce **GIF** fallback with same filename stem.  
- Keep per-artwork payload **≤ 8–12 MB** total (aim for ≤ 3–5 MB for typical 4G).  
- Name consistently: `layer-01.apng` + `layer-01.gif` + `layer-01.png` (if needed).

### 4.3 Manifest schema (v1)
```json
{
  "title": "Monarch Butterfly",
  "aboutLink": "https://artist.tld/about",
  "target": "target.mind",
  "overlays": [
    {
      "id": "layer-01",
      "url": { "apng": "assets/layer-01.apng", "gif": "assets/layer-01.gif", "png": "assets/layer-01.png" },
      "zIndex": 1,
      "position": [0, 0, 0.001],
      "scale": [1, 1, 1],
      "loop": true
    }
  ],
  "fallbackVideo": "assets/fallback.mp4"
}
```

---

## 5) URL & Routing

- Route format: `/ar/<slug>` (no query params to keep QR stable and clean).  
- For GitHub Pages, use a flat `index.html` with slug parsing via `location.pathname` and relative fetch to `/ar/<slug>/manifest.json`.

---

## 6) Loading & Capability Checks

**Preloader**  
- Minimal splash with progress bar (computed from asset count).  
- Hide AR scene until `Promise.all` resolves.

**Capability checks**  
- Detect iOS version, WebGL support, camera permission availability.  
- APNG support test: draw to `<canvas>` or feature-detect via image decoding.  
- If device unsupported → render fallback page with message + `fallbackVideo` (muted/looped).

---

## 7) AR Scene Construction

- Use `<a-scene mindar-image="imageTargetSrc: /ar/<slug>/target.mind">`.  
- For each `overlay` in manifest:
  - Create `<a-plane>` or custom shader material.
  - `position/scale` from manifest (default `[0,0,0]` & `[1,1,1]`).  
  - Set `zIndex` by small z offsets (e.g., 0.001 increments).  
  - For animated bitmaps:
    - APNG: use an `<img>` source; for looping ensure repeatable playback.  
    - GIF fallback: standard `<img>`; accept frame timing variance.  
- Auto‑start animations on `targetFound` event.  
- On `targetLost`, pause/hide overlays to avoid ghosting.

**Footer link**  
- Absolutely positioned, low-contrast small link: “About the artist →” (target=_blank).

---

## 8) Error Handling

| Case | Strategy |
|---|---|
| Manifest 404 | Render “Artwork unavailable.” Provide a back/home link. |
| Asset fetch fail | Retry once; if fail → skip that layer and show small toast. |
| Camera denied | Show instruction panel to enable camera; show fallback video link. |
| Tracking lost | Hide overlays until re-acquired; show “move closer / better light” tip after 2–3s. |
| APNG not supported | Use GIF, or fallback static PNG if neither anim loads. |

---

## 9) Performance

- Image assets sized to match real artwork proportions; keep pixel dimensions reasonable (e.g., 1280–1920 px longest side).  
- Use `Image.decode()` for preloading where available.  
- Cache headers (GitHub Pages default immutable filenames or add content hashes).  
- Defer MindAR/A‑Frame loading until after basic capability checks.

---

## 10) Hosting & Deployment

- Repo layout:
```
/index.html
/js/app.js
/js/preload.js
/css/style.css
/libs/aframe.min.js
/libs/mindar-image-aframe.prod.js
/ar/<slug>/manifest.json
/ar/<slug>/target.mind
/ar/<slug>/assets/*
```
- GitHub Actions optional: validate manifest JSON and asset references on push.  
- Enable GitHub Pages on `/` or `/docs` branch.

---

## 11) Privacy & Permissions

- Camera access is required; keep all processing client-side.  
- No analytics by default. If added later, anonymize and never store media.  
- Provide a brief “We use your camera for AR only; nothing is uploaded.” message in help modal or README.

---

## 12) Test Plan

| Area | Tests |
|---|---|
| Devices | iPhone 8, X, 12/13, 15; Android Pixel 4/6, Samsung S10/S21. |
| Network | Fast Wi‑Fi; 4G throttled; offline (fallback behavior). |
| UX | Scan QR → opens AR; footer link opens in new tab; resume after backgrounding. |
| Assets | APNG plays; GIF fallback loads when APNG blocked; static PNG used if both fail. |
| Tracking | Good light vs low light; angled view; partial occlusion; distance (0.3–1.5 m). |
| Errors | Manifest missing; asset 404; camera denied; unsupported device. |

Acceptance gates per iteration (below).

---

## 13) Iterative Plan (Small, Safe, Valuable)

Each iteration ends with a usable artifact and can be shipped to GH Pages.

### Iteration 0 — Repo Scaffold (≈ 1–2h)
**Scope**: Create repo structure, pin libs, basic index.html with “Hello”.  
**Deliverable**: GH Pages serves `/index.html`.  
**Acceptance**: Loads on iOS/Android; no console errors.

### Iteration 1 — Capability Check + Fallback Shell (≈ 2–4h)
**Scope**: JS that detects device support; renders fallback page with local placeholder video.  
**Deliverable**: `/index.html` switches between “supported AR” vs fallback.  
**Acceptance**: Spoof flags to force fallback; works on both platforms.

### Iteration 2 — Manifest Loader (≈ 2–3h)
**Scope**: Parse `<slug>`; fetch `/ar/<slug>/manifest.json`; render title/footer link (no AR).  
**Deliverable**: Correctly loads manifest for two sample slugs.  
**Acceptance**: Missing manifest → graceful error page.

### Iteration 3 — Preloader + Asset Fetch (≈ 3–5h)
**Scope**: Preload `target.mind` and overlays (APNG/GIF detection); progress UI.  
**Deliverable**: Preloader completes; assets cached in memory.  
**Acceptance**: 404 on one asset → shows toast; continues.

### Iteration 4 — MindAR Boot + Single Plane (≈ 3–5h)
**Scope**: Integrate MindAR + A‑Frame; render one overlay plane on target.  
**Deliverable**: First AR overlay shows when artwork in view.  
**Acceptance**: Target lost → overlay hides; found → shows.

### Iteration 5 — Multiple Layers + Z‑Stack (≈ 3–5h)
**Scope**: Build planes per manifest item; apply z offsets; loop animations.  
**Deliverable**: Two+ layers render and loop.  
**Acceptance**: Each layer can be toggled from manifest.

### Iteration 6 — Footer Link & Minimal Chrome (≈ 1–2h)
**Scope**: Add subtle “About the artist” link; ensure no bars in full-screen.  
**Deliverable**: Link opens in new tab; no layout shift.  
**Acceptance**: Tap areas don’t block AR gestures.

### Iteration 7 — Robust Error Paths (≈ 2–4h)
**Scope**: Camera denied, manifest missing, asset retry, offline hint.  
**Deliverable**: Friendly copy + clear recovery steps.  
**Acceptance**: Manual test matrix passes.

### Iteration 8 — Performance Pass (≈ 2–3h)
**Scope**: Compress heaviest assets, lazy init libraries post-capability check, cache headers.  
**Deliverable**: TTI ≤ ~2–3s on Wi‑Fi, ≤ ~5–7s on 4G.  
**Acceptance**: Throttled tests within budget.

### Iteration 9 — Productionize Two Artworks (≈ 2–4h)
**Scope**: Add two real slugs, final assets, generate `target.mind`.  
**Deliverable**: QR codes for both pieces.  
**Acceptance**: Gallery dry‑run on iOS + Android succeeds.

---

## 14) Ticketized Backlog (bite‑sized but meaningful)

| ID | Task | Size | Depends | Acceptance Criteria |
|---|---|---:|---|---|
| T00 | Init repo, GH Pages | S | — | Page loads over HTTPS on mobile. |
| T01 | Vendor libs to `/libs` | S | T00 | MindAR/A‑Frame files present; integrity checked. |
| T02 | Support detection util | S | T00 | Returns boolean flags for device/APNG/WebGL/camera. |
| T03 | Fallback page w/ video | S | T02 | Plays loop muted; copy visible. |
| T04 | Slug parser + router | S | T00 | Extracts `<slug>` reliably incl. trailing slash. |
| T05 | Manifest fetch + validate | M | T04 | 200 → JSON; non-200 → error page. |
| T06 | APNG/GIF capability | S | T02 | Correctly selects APNG, else GIF, else PNG. |
| T07 | Preloader module | M | T05,T06 | Shows progress; resolves when all assets ready. |
| T08 | MindAR init | M | T07 | Starts camera; no console errors. |
| T09 | Single overlay plane | S | T08 | Aligns with target; hides on loss. |
| T10 | Multi-layer builder | M | T09 | Renders N planes; respects zIndex. |
| T11 | Footer link UI | S | T05 | Opens target=_blank; safe area compliant. |
| T12 | Error paths & retries | M | T05 | Asset retry once; user-visible toast. |
| T13 | Perf tune & budgets | M | T10 | Lighthouse mobile OK; load budgets met. |
| T14 | Produce 2 slugs content | M | T05 | Real assets pushed; validated. |
| T15 | Generate QR codes | S | T14 | Scan opens correct slug reliably. |

Size: S ≈ ≤2h, M ≈ 3–5h, L ≈ 1–2 days.

---

## 15) Definition of Done (per release)

- All ACs green in table above.  
- Test plan executed on at least 2 iPhones + 2 Androids.  
- No uncaught console errors.  
- Payload within agreed budget.  
- README updated (how to add a new artwork).

---

## 16) How to Add a New Artwork (Ops Playbook)

1) Prepare cropped target image (art only) and generate `target.mind`.  
2) Export overlays as APNG (and GIF fallback).  
3) Create folder `/ar/<slug>/assets`, copy files.  
4) Author `/ar/<slug>/manifest.json`.  
5) Push to GitHub; confirm page loads; test on device.  
6) Generate high‑contrast QR pointing to `/ar/<slug>` (add small center logo if desired).

---

## 17) Risks & Mitigations

| Risk | Mitigation |
|---|---|
| iOS tracking jitter | Use high‑quality target; good lighting; reduce overlay complexity. |
| APNG inconsistencies | Provide GIF + static PNG fallback; keep frame rates modest. |
| Large payloads | Compress assets; limit animation dimensions; cache aggressively. |
| Camera permission blocks | Clear copy; link to Settings instructions; provide fallback video. |
| Gallery network | Preload on Wi‑Fi; test 4G; consider offline cached assets if needed later. |

---

## 18) Next Actions (Concrete)

- [ ] T00–T03 today: scaffold, support check, fallback.  
- [ ] T04–T09 tomorrow: manifest → first working AR with single overlay.  
- [ ] T10–T12: multi-layer + robust errors.  
- [ ] T13–T15: perf pass, add two real artworks, print QRs.
