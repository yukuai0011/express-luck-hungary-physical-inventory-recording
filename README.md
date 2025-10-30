# Express Luck Hungary — MAUI App

This repository contains a minimal .NET MAUI conversion of the original Express Luck Hungary physical inventory recording app. It is intended to be built on GitHub Actions to produce an Android APK.

Files of interest
- `ExpressLuckMaui.csproj` — MAUI project targeting Android
- `.github/workflows/build-android.yml` — CI workflow that builds an Android APK and uploads it as an artifact

How CI builds
- The workflow runs on `windows-latest`, installs .NET, MAUI workloads, and publishes an APK to `./artifacts`. The workflow uploads that directory as an artifact named `android-apk`.

Notes
- This is a minimal scaffold. Replace UI and business logic with the real app code as needed.
