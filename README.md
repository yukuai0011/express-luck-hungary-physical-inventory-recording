# Express Luck Hungary — Inventory Scanner (NativeScript)

NativeScript Android app for physical inventory recording. Scans two QR codes to create a Recording Profile, then scans package barcodes and submits records to a provided API endpoint.

- Tech: NativeScript Core (TypeScript), nativescript-barcodescanner
- Platform: Android (APK built via GitHub Actions)
- Storage: Persists profile in app storage (similar to cookie on web)

## Features

- Scan 2 QR codes (in any order):
  - API Endpoint JSON: { "apiEndpoint": "https://..." } (angle brackets optionally allowed)
  - Recording Info JSON: { "orderNo": "1234", "recordingNo": 1, "locationCode": "FG HU" }
- Optional Bearer token
- Scan or type Package No
- Package intact toggle; when checked, Quantity is disabled and sent as 0
- Submit HTTP POST with headers:
  - Content-Type: application/json
  - Accept: application/json
  - x-ms-client-tracking-id: <uuid>
  - Authorization: Bearer <token> (optional)

## CI — Android APK

On every push, GitHub Actions builds a Debug APK and uploads it as an artifact.

- Workflow: .github/workflows/android-build.yml
- Artifact name: app-debug.apk
- Download it from the Actions run page.

## Dev notes

- Config: nativescript.config.ts
- Entry: app/app.ts, UI: app/home-page.xml, logic: app/home-page.ts
- Android resources: App_Resources/Android/...

This app mirrors the functionality of the web PoC in the repository root (index.html, app.js).