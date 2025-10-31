# Inventory Scanner - NativeScript + Svelte

A mobile application for physical inventory recording, built with NativeScript and Svelte.

## Features

- **QR Code Scanning**: Scan two QR codes to establish a recording profile:
  - API Endpoint configuration
  - Recording information (Order No, Recording No, Location Code)
- **Barcode Scanning**: Scan package barcodes for quick data entry
- **Profile Management**: Save and persist recording profiles locally
- **Package Recording**: Submit package records with quantity and intact status
- **Power Automate Integration**: Direct integration with Microsoft Power Automate endpoints

## Technology Stack

- **NativeScript**: Cross-platform native mobile framework
- **Svelte**: Reactive UI framework
- **TypeScript**: Type-safe development
- **nativescript-barcodescanner**: Native barcode/QR scanning

## Project Structure

```
├── app/
│   ├── components/
│   │   ├── ProfileSetup.svelte    # Profile configuration screen
│   │   └── WorkScreen.svelte      # Package recording screen
│   ├── services/
│   │   ├── api.ts                 # Power Automate API integration
│   │   ├── barcode-scanner.ts     # Barcode/QR scanning service
│   │   └── storage.ts             # Local data persistence
│   ├── App.svelte                 # Main app component
│   ├── app.css                    # Global styles
│   └── app.ts                     # App entry point
├── App_Resources/                 # Platform-specific resources
├── .github/
│   └── workflows/
│       └── build-android.yml      # GitHub Actions build workflow
├── package.json
├── nativescript.config.ts
├── tsconfig.json
└── webpack.config.js
```

## Setup

### Prerequisites

- Node.js 20+
- NativeScript CLI: `npm install -g @nativescript/cli`
- Android SDK (for Android builds)
- Java Development Kit 17+

### Installation

```bash
# Install dependencies
npm install

# Run on Android
npm run dev:android

# Build Android APK
npm run build:android
```

## GitHub Actions CI/CD

The project includes a GitHub Actions workflow that automatically builds Android APKs on push to main/develop branches.

### Workflow Features:
- Automatic APK building
- Artifact upload to GitHub Actions
- Release creation on main branch pushes
- Configurable keystore signing (use GitHub Secrets for production)

### Setting up Keystore Secrets (Optional):
Add these secrets in your GitHub repository settings:
- `KEYSTORE_PASSWORD`: Password for the keystore
- `KEY_PASSWORD`: Password for the signing key

If not provided, default passwords will be used for development builds.

## Usage

### 1. Profile Setup

1. Open the **Profile** tab
2. Tap **Scan QR Code** to scan:
   - First QR: API endpoint JSON
   - Second QR: Recording info JSON
3. Optionally add a Bearer token for OAuth authentication
4. Tap **Save Profile** to persist the configuration

#### QR Code Formats:

**API Endpoint QR:**
```json
{
  "apiEndpoint": "https://your-endpoint.powerplatform.com/..."
}
```

**Recording Info QR:**
```json
{
  "orderNo": "1234",
  "recordingNo": 1,
  "locationCode": "FG HU"
}
```

### 2. Recording Packages

1. Switch to the **Work** tab
2. Enter or scan the package number
3. Check "Package intact" if applicable (disables quantity input)
4. If not intact, adjust quantity using +/- buttons
5. Tap **Submit** to send the record

## API Integration

The app sends POST requests to Power Automate endpoints with the following payload:

```json
{
  "orderNo": "1234",
  "recordingNo": 1,
  "locationCode": "FG HU",
  "packageNo": "R2500041512",
  "quantity": 30,
  "packageIntact": false
}
```

## Permissions

The app requires the following permissions:
- **Camera**: For QR code and barcode scanning
- **Internet**: For API communication

## Development

### Build for Development
```bash
npm run build:android:debug
```

### Clean Build
```bash
npm run clean
```

### Production Build
```bash
npm run build:android
```

## License

MIT

## Author

Express Luck Hungary
