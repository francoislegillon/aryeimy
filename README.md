# AR QR Gallery

A simple WebAR experience built with A-Frame and MindAR. Visitors scan a QR code next to an artwork, the browser opens the AR experience, and animated overlays render directly on top of the piece.

## Quick start

1. Clone this repository.
2. Serve the project locally with any static server (examples below).
3. Open the served URL on a modern mobile browser and browse the gallery.

### Using `npx serve`

```bash
npx serve .
```

### Using Python

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## How it works

- **Simple Architecture**: Each AR experience is completely self-contained in its own directory
- **No Complex Routing**: Direct links to `/ar/<slug>/index.html` 
- **Manifest-Driven**: Each experience reads a `manifest.json` file to configure overlays
- **Browser-Native**: Uses CDN versions of A-Frame and MindAR, no build process required
- **Mobile-First**: Optimized for mobile browsers with proper camera handling

## Sample artworks

| Experience | Description | Link |
| ---------- | ----------- | ---- |
| **Demo** | Simple development example | `/ar/demo/index.html` |
| **Monarch** | Butterfly concept with animated overlays | `/ar/monarch/index.html` |
| **Lotus** | Luminous lotus with three dynamic layers | `/ar/lotus/index.html` |
| **Paramo** | Interactive landscape with video elements | `/ar/paramo/index.html` |

## Repository layout

```
ar/
  demo/           # Simple demo AR experience
    index.html    # Self-contained AR app
    manifest.json # Configuration
    target.mind   # MindAR tracking target
    assets/       # Overlay images/videos
  monarch/        # Butterfly AR experience  
  lotus/          # Lotus AR experience
  paramo/         # Landscape AR experience
docs/             # Documentation
.github/workflows/ # CI validation
```

## Key simplifications

**Before**: 1686+ lines of complex JavaScript across 6 modules, device detection, complex routing, preloading systems, fallback handling.

**After**: ~130 lines per AR experience, everything self-contained, direct approach using A-Frame and MindAR with simple manifest loading.

### What was removed:
- Complex SPA routing system
- Device capability detection 
- Progress bars and preloading UI
- Support for legacy browsers
- Complex state management
- 6 separate JavaScript modules
- Custom CSS framework
- Vendored library files

### What remains:
- Clean AR experiences that just work
- Manifest-driven configuration
- Support for images and videos
- Error handling
- Mobile optimization
## Adding a new artwork

1. Create a new folder under `/ar/<slug>/` (e.g., `/ar/myart/`).
2. Copy the structure from an existing artwork (e.g., `/ar/demo/`):
   ```
   ar/myart/
     index.html      # Copy from demo and update title
     manifest.json   # Configure your overlays
     target.mind     # Your MindAR tracking target
     assets/         # Your overlay images/videos
   ```
3. Update `manifest.json`:
   - Set `title` and `aboutLink`
   - Configure each overlay with `position`, `scale`, and asset URLs
   - Supported formats: PNG, JPG, GIF, WebP, MP4
4. Replace `target.mind` with your MindAR tracking target
5. Add your overlay assets to the `assets/` folder
6. Update the main gallery page (`index.html`) to include a link to your new experience

### Example manifest.json:
```json
{
  "title": "My Artwork",
  "aboutLink": "https://mywebsite.com",
  "target": "target.mind",
  "overlays": [
    {
      "id": "layer-1",
      "url": { "png": "assets/overlay1.png" },
      "position": [0, 0, 0.1],
      "scale": [1, 1, 1],
      "opacity": 1.0
    }
  ]
}
```

## Asset guidelines

- Keep overlay images ≤ 1920px on the longest edge
- Use PNG for images with transparency
- Use MP4 for videos (autoplay, loop, muted)
- Generate `target.mind` files using the MindAR CLI or online editor
- Test locally before deploying

## Deployment

### GitHub Pages
1. Push to GitHub
2. Enable GitHub Pages (Settings → Pages → Deploy from `main` branch)
3. Access via `https://yourusername.github.io/yourrepo/`

### Any Static Host
Just upload the files - no build process required!

## Technical details

Each AR experience is a single HTML file that:
1. Loads A-Frame and MindAR from CDN
2. Reads the local `manifest.json` 
3. Creates A-Frame assets and entities dynamically
4. Handles basic error states

The total code per experience is ~130 lines, making it easy to customize and maintain.

## License

Released under the MIT License. See [`LICENSE`](./LICENSE) for details.
