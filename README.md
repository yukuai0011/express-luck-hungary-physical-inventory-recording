# Express Luck Inventory (Tauri + SvelteKit)

This is the Tauri v2 + SvelteKit + Tailwind + DaisyUI rewrite of the physical inventory recording app.

Highlights:
- Barcode/QR scanning using the official Tauri mobile plugin on Android (with ZXing fallback for desktop/dev).
- No local environment required to produce Android APKs — GitHub Actions workflow builds split-per-ABI APKs and publishes them as artifacts.

## Project structure
- `src/` — SvelteKit app UI
- `src-tauri/` — Tauri v2 Rust project and configuration
- `.github/workflows/android.yml` — CI build for Android APKs

## Development (optional)
You can run the UI locally if desired:

- Install Node 20+, Rust, Android SDK (only if you want to run on device). Not required for CI-only usage.
- `npm install`
- `npm run dev`
- In another terminal: `npm run tauri:dev` (requires the Tauri CLI)

## Android CI build
Push changes to this folder or run the workflow manually to trigger a CI build.
- Workflow: `.github/workflows/android.yml`
- Output: APKs uploaded as the `android-apks` artifact.

## App behavior
- Create a profile by scanning two QR codes:
  1) API endpoint JSON: `{ "apiEndpoint": "<https://...>" }` (angle brackets are allowed and will be stripped)
  2) Recording info JSON: `{ "orderNo": "...", "recordingNo": "...", "locationCode": "..." }`
- Optional: add a Bearer token to include an `Authorization: Bearer ...` header on submit.
- Work:
  - Scan or type a package number.
  - If `Package Intact` is checked, `quantity` is sent as `0`.
  - Submit sends a POST to the API endpoint with JSON body:
    ```json
    {
      "orderNo": "...",
      "recordingNo": "...",
      "locationCode": "...",
      "packageNo": "...",
      "quantity": 0,
      "packageIntact": true
    }
    ```
  - Headers include `Content-Type: application/json`, `Accept: application/json`, `x-ms-client-tracking-id`, and `Authorization` if provided.

## Notes
- Scanning uses the Tauri plugin on Android which requests runtime permissions automatically. On desktop/dev it falls back to the browser camera via ZXing.
- The root-level `index.html` and `prompt.txt` remain as references for the legacy web prototype.