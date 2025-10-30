# Inventory Scanner (React Native + Expo)

Cross-platform inventory scanning app using Expo and [Gluestack UI](https://ui.gluestack.io/). No Expo account required.

## Features

- Profile setup by scanning two QR codes (in any order):
  - API Endpoint JSON: { "apiEndpoint": "<https://...>" }
  - Recording Info JSON: { "orderNo": "1234", "recordingNo": 1, "locationCode": "FG HU" }
- Optional bearer token stored locally
- Package submission: scan barcode or type package number, set intact toggle and quantity
- Sends POST with headers: Content-Type, Accept, x-ms-client-tracking-id, and optional Authorization
- Persists profile via AsyncStorage
- CI builds web bundle and uploads as GitHub Actions artifact

## Scripts

- `npm start` — start Expo dev server (web)
- `npm run web` — same as start (web target)
- `npm run typecheck` — TypeScript type checking
- `npm run build:web` — Export static web build to `web-dist/`

## Development

You can develop locally without logging into Expo.

```bash
npm install
npm start
```

Open the web preview from the Expo dev server UI. Android/iOS native builds require native SDKs and are not configured in CI to avoid requiring an Expo account.

## Notes

- Gluestack UI is used for theming and components.
- Camera scanning is implemented with `expo-barcode-scanner`.
- UUID v4 is generated for `x-ms-client-tracking-id`.