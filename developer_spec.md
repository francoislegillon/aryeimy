# AR QR Gallery Project - Developer Specification

## 1. Overview
A simple WebAR experience for galleries:
- Visitors scan a QR code next to a physical artwork.
- The browser immediately opens a WebAR view.
- The artwork itself is the image target.
- Animated overlay layers (GIF/APNG/PNG) appear on top of the physical artwork in AR.

Primary goals:
- **Simplicity** (direct scan → AR).
- **Open-source** stack.
- **Static hosting** compatible (GitHub Pages, S3).
- **Minimal dependencies** for artists.

---

## 2. Core Requirements

### Functional
- QR code → URL → AR view.
- Image tracking based on artwork (not frame).
- Overlay layers (PNGs + animated APNG/GIFs).
- All layers loop automatically, in sync.
- Silent playback (no sound).
- Optional **“About the artist”** link in footer.
- Overlays should be **transparent** so the real artwork remains visible.
- Assets loaded dynamically from manifest.

### Non-Functional
- Runs on iOS 15+ (iPhone 8 and newer) and Android 9+.
- Reliable on Chrome (Android) and Safari (iOS).
- Fallback video if unsupported.
- High contrast QR codes with small artist logo in center.
- Static hosting compatible.

---

## 3. Architecture

### Stack
- **MindAR** for image tracking.
- **A-Frame** for easy 2D plane overlays (with transparent assets).
- Hosted as a static site (GitHub Pages → possible migration to S3/CDN).

### Flow
1. Visitor scans QR.
2. Opens `https://domain.com/ar/<slug>`.
3. Page loads:
   - Preloads manifest.json for `<slug>`.
   - Downloads target image + overlay assets.
   - Preloads fully before showing AR view.
4. Camera starts → MindAR tracks target.
5. A-Frame planes render overlay layers.
6. Overlays loop continuously.

---

## 4. Data Handling

### Manifest format (per artwork)
`/art/<slug>/manifest.json`
```json
{
  "title": "Monarch Butterfly",
  "target": "target.mind",
  "overlays": [
    {
      "url": "layer1.png",
      "zIndex": 1,
      "position": [0, 0, 0],
      "scale": [1, 1, 1],
      "loop": true
    },
    {
      "url": "layer2.apng",
      "zIndex": 2,
      "position": [0, 0, 0.01],
      "scale": [1, 1, 1],
      "loop": true
    }
  ],
  "aboutLink": "https://artistwebsite.com"
}
```

### Assets
- `target.mind` (MindAR image descriptor).
- Overlay images in PNG/APNG/GIF.
- Optional fallback video (mp4/webm).

---

## 5. Error Handling

- **Unsupported device/browser**:
  - Show a fallback message + demo video of effect.
- **Asset loading failure**:
  - Retry once.
  - If still failing, display “Overlay unavailable” message.
- **Tracking loss**:
  - Hide overlays until target re-acquired.

---

## 6. Hosting & Deployment

- GitHub Pages or Netlify (default).
- Directory structure:
```
/ar/index.html (core app)
/ar/<slug>/manifest.json
/ar/<slug>/assets/*
/libs/mindar/* (static MindAR + A-Frame)
```

---

## 7. QR Codes

- Generated per artwork: `domain.com/ar/<slug>`.
- High-contrast black/white.
- Center logo overlay allowed if error correction supports it.
- Permanent — manifests can be updated without reprinting.

---

## 8. Testing Plan

### Device Coverage
- iPhone 8, X, 11, 13, 15 (Safari).
- Android mid-range (Pixel 4, Galaxy S10, OnePlus 8).
- Latest Chrome, Safari.

### Cases
1. **Happy path**: QR scan → AR loads, overlays loop.
2. **Slow network**: Preloading screen until ready.
3. **Unsupported device**: Fallback video appears.
4. **Asset missing**: Error message shown.
5. **Tracking loss**: Overlay hides, resumes when target found.
6. **Multi-artwork**: Different slugs load correct manifests.

---

## 9. Future Extensions (Out of Scope)
- Audio overlays.
- Sequenced animation timelines.
- Artist self-service portal.
- Advanced 3D models.

---

## 10. Deliverables
- `index.html` template with MindAR + A-Frame integration.
- Example manifest + assets for 1 artwork.
- Documentation (this spec + README).
- Fallback video integration stub.
