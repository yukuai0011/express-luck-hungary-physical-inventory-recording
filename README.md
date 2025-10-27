# Express Luck Inventory (Nuxt + Tauri)

Offline-first physical inventory recording app built with Nuxt 3, Tauri 2, and DaisyUI.

This repository is public (used as a submodule), so no secrets or sensitive information are stored here.

## Features

- Offline by default (bundled with Tauri; optional PWA when run on the web)
- Local data persistence in AppData (desktop) or app sandbox (Android)
- Export inventory as CSV to the Downloads folder
- Modern UI with Tailwind CSS and DaisyUI

## Getting Started

Prerequisites:
- Node.js 20+
- Rust (stable)
- Windows: Visual C++ Build Tools and WebView2
- Android build (optional): Android SDK, NDK, Java 17

Install deps and run in browser (for local dev):

```bash
npm ci
npm run dev
```

Run with Tauri (desktop):

```bash
npm run tauri:dev
```

Build desktop bundle:

```bash
npm run build
npm run tauri:build
```

Build Android APK (CI recommended):

```bash
npm run tauri:android:build
```

## Data Storage

The app stores inventory items as JSON at:
- AppData/ExpressLuckInventory/inventory.json (desktop)
- App sandbox directory (Android)

Exports are written to:
- Downloads/ExpressLuckInventory/*.csv

## GitHub Actions

Workflows build on all branches:

- `.github/workflows/build-desktop.yml` — builds Windows executable and uploads artifacts
- `.github/workflows/build-android.yml` — builds Android APK and uploads artifacts

> CI does not require any secrets. Keystores are not included; Android artifacts are debug/release-signed by the build system.

## License

MIT