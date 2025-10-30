# Inventory Scanner PoC (React Native + Expo + GlueStack)

This folder contains the React Native rewrite of the Inventory Scanner app using Expo and GlueStack UI. No Expo account is required.

CI builds an Android APK using GitHub Actions without EAS.

## Features
- Recording Profile via two QR codes: API Endpoint and Recording Info
- Optional Bearer token storage
- Package work form: package number (barcode scan), package intact, quantity, submit
- AsyncStorage-based profile persistence
- Expo Barcode Scanner for QR and barcode reading

## Project structure
- App.js – Main application UI
- src/lib/storage.js – AsyncStorage helpers
- src/lib/utils.js – Utility helpers
- .github/workflows/android-build.yml – GitHub Action to build an APK

## Run locally (optional)
If you want to run this locally and you have Node + Android Studio installed:

pwsh
# From repo root
cd express-luck-hungary-physical-inventory-recording-public
npm install
# Ensure compatible native deps are installed
npx expo install expo-barcode-scanner @react-native-async-storage/async-storage @gluestack-ui/themed @gluestack-ui/config react-native-svg
# Run on Android device/emulator
npx expo prebuild --platform android --non-interactive
cd android
./gradlew.bat assembleDebug   # on Windows
# or
./gradlew assembleDebug       # on macOS/Linux

Note: You don't need an Expo account for the above. The CI pipeline already produces an APK artifact via GitHub Actions.

## CI: Build Android APK
The workflow lives at .github/workflows/android-build.yml in this folder. It:
- Installs Node, Java, and the Android SDK
- Installs dependencies, runs expo prebuild (no Expo account)
- Builds app-debug.apk via Gradle
- Uploads the APK as a GitHub Actions artifact

Triggers:
- Manual: "Run workflow"
- On push changes under this folder

Artifact path:
express-luck-hungary-physical-inventory-recording-public/android/app/build/outputs/apk/debug/app-debug.apk

## Notes
- Mobile apps aren’t subject to browser CORS.
- The API endpoint should accept JSON POSTs; an x-ms-client-tracking-id UUID header is included.
- The original website assets remain in the workspace root; this mobile app is separate and self-contained here.