# Inventory Recorder (Ionic Vue + Capacitor)

This is the Ionic Vue + TypeScript rewrite of the Inventory Scanner. It runs on the web and can be packaged for Android via Capacitor.

## Key Tech

## Development (optional)
If you want to run locally (not required for CI):


## Android CI build
A GitHub Actions workflow is included at `.github/workflows/android-build.yml` (inside this folder). It will:
- Install Node, Java 17, and Android SDK
- Build the web app (vite build)
- `cap sync android` to create/update the Android project
- Build a debug APK via Gradle and upload it as a CI artifact

Trigger by pushing to any branch or opening a PR. The artifact will be available in the workflow run.
- The app requests camera permission for scanning QR and barcodes.
- Profile info is stored in a cookie named `inventoryProfile` for 365 days.
