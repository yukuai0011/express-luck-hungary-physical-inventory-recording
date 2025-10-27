# Inventory Scanner POC

A simple Flutter proof-of-concept inventory scanner app with a two-QR profile setup and a Power Automate HTTP submit.

- Profile is established by scanning two QR codes (in any order):
  1) API endpoint JSON
  2) Order/location JSON
- The combined profile is saved locally as JSON (SharedPreferences).
- Work screen lets you enter or scan a package number, toggle "package intact", adjust quantity (disabled if intact), and submit.
- Submission posts to the API endpoint following the sample Python script payload.

## QR JSON Formats

API endpoint:

```json
{ "apiEndpoint": "<https://...your-power-automate-url...>" }
```

Order/location:

```json
{ "orderNo": "1234", "recordingNo": 1, "locationCode": "FG HU" }
```

Notes:
- Angle brackets around the URL are optional; the app will strip them if present.
- The profile JSON (as saved) is just a merge of the above.

## Build via GitHub Actions

No local build required. Push this repository or trigger the workflow manually to produce artifacts:
- Android: app-release.apk
- Windows: zipped release folder containing the .exe

Workflow file: `.github/workflows/flutter-ci.yml`

Artifacts appear under the workflow run’s Artifacts section.

## Running locally (optional)

If you do have Flutter installed:

```powershell
cd express-luck-hungary-physical-inventory-recording
flutter pub get
# Only if platforms were not generated yet
flutter create --platforms=android,windows .
# Run
flutter run -d windows   # or -d emulator / -d chrome
```

Camera scanning uses `mobile_scanner` and is supported on Android and iOS. On desktop/web, scanning is disabled; you can paste the JSON for the profile and type the package number.

## Payload sent

The app posts JSON to your profile’s `apiEndpoint`:

```json
{
  "orderNo": "1234",
  "recordingNo": 1,
  "locationCode": "FG HU",
  "packageNo": "R2500041512",
  "quantity": 30.0,
  "packageIntact": true
}
```

Headers include:
- `Content-Type: application/json`
- `Accept: application/json`
- `User-Agent: inventory-scanner-poc/1.0`
- `x-ms-client-tracking-id: <uuid>`

## License

POC, no warranty.