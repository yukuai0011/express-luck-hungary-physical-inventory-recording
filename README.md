# Inventory Scanner (Tauri + Next.js)

A proof-of-concept inventory scanning app using Next.js for the UI and Tauri 2 for desktop/mobile packaging. Android APKs are built automatically via GitHub Actions for all branches and uploaded as workflow artifacts.

## Tech
- Next.js 15 (SSG/static export)
- Tauri 2 (mobile-ready, Rust backend)
- ZXing UMD for QR/Barcode scanning

## Develop
- UI: npm run dev
- Tauri desktop window (local only): npm run tauri dev

Note: In CI we build the Android APK; local Android toolchain is not required.

## Build
- Web export (used by Tauri): npm run build (outputs to ./dist)
- Tauri desktop: npx tauri build (requires OS-specific deps)
- Android APK (CI): see .github/workflows/android.yml

## Structure
- pages/, styles/: Next.js app ported from the original static site
- src-tauri/: Tauri 2 Rust app skeleton
- prompt.txt: Original generation prompt for the UI

## CI
On every push to any branch, the workflow builds the Android APK using:
- Node LTS, Rust stable, Android SDK + NDK
- npx tauri android init (to generate Android project)
- npx tauri android build (release)

The resulting APK is uploaded as an artifact.

## License
MIT