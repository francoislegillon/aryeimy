# QR Code Production Notes

Use these guidelines when generating QR codes that launch `/ar/<slug>` URLs in the gallery:

- **Error correction**: choose level **M** (15%) or **H** (30%) so a small artist logo can sit in the center without breaking scans.
- **Contrast**: dark foreground on a light matte background. Avoid gradients and busy textures near the quiet zone.
- **Quiet zone**: keep at least 4 modules of whitespace around the code so phones can isolate it quickly.
- **Size**: print at a minimum of 3.5–4&nbsp;cm (1.4–1.6") per side for chest-height viewing distances. Larger is safer for dim galleries.
- **Logo overlay**: keep overlays ≤ 20% of the code width and ensure the logo uses flat colors.
- **URL format**: use HTTPS URLs like `https://your-domain.com/ar/monarch`. Short links are unnecessary when the slug is memorable.
- **Testing**: validate each print on iOS Safari and Android Chrome before mounting. Check both indoor gallery lighting and natural light.
- **Version control**: store the vector or high-resolution source files alongside the artwork assets so future prints stay consistent.

Printing tip: laminate or coat the sticker with a matte finish to avoid glare from gallery spotlights.
