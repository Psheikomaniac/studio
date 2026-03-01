# PWA Icons

This directory should contain PWA icons in the following sizes:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Generate Icons

Use one of these tools to generate icons from your logo:

1. **PWA Builder Image Generator**
   https://www.pwabuilder.com/imageGenerator

2. **RealFaviconGenerator**
   https://realfavicongenerator.net/

3. **Favicon.io**
   https://favicon.io/favicon-generator/

## Requirements

- PNG format
- Square aspect ratio
- Transparent background recommended
- Maskable icons (safe zone: 80% of canvas)

## Quick Start

If you don't have a logo yet, create placeholder icons:

```bash
# Install ImageMagick
sudo apt-get install imagemagick

# Generate placeholder icons
for size in 72 96 128 144 152 192 384 512; do
  convert -size ${size}x${size} xc:#000000 \
    -gravity center \
    -fill white \
    -pointsize $((size / 4)) \
    -annotate +0+0 "balanceUp" \
    icon-${size}x${size}.png
done
```

## Test PWA

After adding icons:

1. Build app: `npm run build`
2. Start production: `npm start`
3. Open in Chrome
4. DevTools → Application → Manifest
5. Check "Add to Home Screen" works
