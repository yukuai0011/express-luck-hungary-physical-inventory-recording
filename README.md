# Express Luck Hungary - Physical Inventory Recording (React Native)

This repository contains a React Native app (Expo-managed JS, prebuilt native) using GlueStack UI. A GitHub Action builds an Android APK on every push using Expo prebuild + Gradle (no Expo account required) and uploads it as a workflow artifact.

## Tech
- React Native (Expo managed)
- GlueStack UI (@gluestack-ui/themed)
- Gradle Android build on CI (after `expo prebuild`)

## Structure
- App.js — main screen using GlueStack UI components
- app.json — Expo app configuration (Android-focused)
- eas.json — EAS build profile configured for a local APK build
- .github/workflows/build-android-apk.yml — CI workflow to build and upload APK

## CI build output
The workflow generates `android/app/build/outputs/apk/debug/app-debug.apk` and uploads it as an artifact `app-debug.apk` that you can download from the workflow run page.

## Local development (optional)
If you do want to run this locally (not required), install Node.js 20+, then:

1. Install dependencies: `npm install`
2. Start the Expo dev server: `npm run start`
3. Launch on Android (requires Android Studio or a connected device): `npm run android`

> Note: CI uses `expo prebuild` to generate native projects, then builds with Gradle. No Expo account is required.

## Windows (future)
If a Windows app is needed later, we can migrate/extend this project to add React Native Windows. GlueStack UI components are cross-platform at the JS layer. We’ll add the Windows native project with the React Native Windows tooling and a Windows-specific CI job.
