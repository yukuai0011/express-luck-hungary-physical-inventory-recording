# Express Luck Hungary Physical Inventory Recording (Mobile)

NativeScript + Svelte Native mobile app.

This repository is a Git submodule under the main project and contains only the mobile app and its CI.

## Structure

- `app/` – app sources (Svelte Native)
- `App_Resources/` – Android resources (minimal Manifest)
- `nativescript.config.ts` – NativeScript configuration
- `webpack.config.js` – Webpack + Svelte loader setup
- `.github/workflows/android-ci.yml` – GitHub Actions workflow to build an Android APK (Debug)

## Building

The GitHub Action builds a Debug APK automatically on each push. The artifact can be downloaded from the workflow run as `app-debug-apk`.

Local builds are not required and not configured.

## Notes

- The workflow builds a Debug APK (no keystore). If you need a Release build, add signing config via `ns build android --release --keyStorePath ...` and secrets.
- The website is maintained in the root workspace and is not part of this submodule.
