# Assets Directory

This directory contains app assets such as icons and splash screens.

## Required Assets

Before building the app, you need to create the following image files:

1. **icon.png** (1024x1024 px) - App icon
2. **splash.png** (1284x2778 px) - Splash screen
3. **adaptive-icon.png** (1024x1024 px) - Android adaptive icon
4. **favicon.png** (48x48 px) - Web favicon

## Generating Assets

You can use online tools or design software to create these assets:

- **Figma**: https://www.figma.com/
- **Canva**: https://www.canva.com/
- **Icon Generator**: https://icon.kitchen/
- **App Icon Generator**: https://appicon.co/

## Quick Start

For testing purposes, you can use solid color placeholders:

```bash
# Create placeholder icons (requires ImageMagick or similar)
convert -size 1024x1024 xc:#0f172a icon.png
convert -size 1284x2778 xc:#0f172a splash.png
convert -size 1024x1024 xc:#0f172a adaptive-icon.png
convert -size 48x48 xc:#0f172a favicon.png
```

Or download free icons from:
- https://www.flaticon.com/
- https://www.iconfinder.com/
- https://icons8.com/
