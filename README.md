# Inventory Scanner - React Native App

A cross-platform inventory scanning application built with React Native, TypeScript, Expo, and DaisyUI/TailwindCSS.

## Features

- 📱 **Cross-platform**: Works on Android, iOS, and Windows (via Electron)
- 📷 **Camera Scanning**: QR code and barcode scanning
- 💾 **Offline Support**: Works offline with local storage
- 🎨 **Modern UI**: Built with DaisyUI and TailwindCSS
- 🔒 **Secure**: Optional bearer token authentication
- 📦 **Profile Management**: Save and reuse scanning profiles

## Technology Stack

- **React Native** with **Expo** for cross-platform mobile development
- **TypeScript** for type safety
- **TailwindCSS** + **DaisyUI** via NativeWind for styling
- **Expo Camera** for QR/barcode scanning
- **AsyncStorage** for offline data persistence
- **Electron** for Windows desktop builds

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- For Android development: Android Studio and Android SDK
- For iOS development: Xcode (macOS only)
- For Windows development: Windows 10/11

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

## Development

### Mobile Development

```bash
# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on Web
npm run web
```

### Desktop Development (Windows)

```bash
# Run Electron in development mode
npm run electron:dev
```

## Building for Production

### Android APK

The GitHub Actions workflow automatically builds APK files on every push. To build locally:

```bash
# Prebuild Android native code
npx expo prebuild --platform android

# Build APK
cd android && ./gradlew assembleRelease
```

### Windows EXE

The GitHub Actions workflow automatically builds Windows executables. To build locally:

```bash
# Export web bundle
npx expo export --platform web --output-dir dist

# Build Windows executable
npm run build:windows
```

## GitHub Actions CI/CD

This project includes automated builds via GitHub Actions:

- **Triggers**: Runs on all branches (not just main)
- **Artifacts**: 
  - Android APK (debug build)
  - Windows EXE and MSI installers
- **Release**: Automatically creates GitHub releases when you push a tag (e.g., `v1.0.0`)

### Manual Build Trigger

You can manually trigger builds from the GitHub Actions tab using the "Run workflow" button.

## Project Structure

```
├── src/
│   ├── components/      # React components
│   │   ├── Header.tsx
│   │   ├── ProfileSection.tsx
│   │   ├── WorkSection.tsx
│   │   └── ScannerModal.tsx
│   └── types/          # TypeScript type definitions
├── .github/
│   └── workflows/      # GitHub Actions workflows
├── App.tsx             # Main app component
├── app.json            # Expo configuration
├── electron.js         # Electron main process
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Usage

### 1. Create a Profile

1. Tap "Scan QR" to scan two QR codes:
   - **API Endpoint QR**: Contains your API endpoint URL
   - **Recording Info QR**: Contains order number, recording number, and location code

2. Optionally enter a bearer token for authentication

3. Tap "Save Profile" to store the configuration

### 2. Scan Packages

1. Enter or scan a package number
2. Set whether the package is intact
3. If not intact, enter the quantity
4. Tap "Submit" to send the data to your API endpoint

## QR Code Formats

### API Endpoint QR
```json
{
  "apiEndpoint": "https://your-api-endpoint.com/path"
}
```

### Recording Info QR
```json
{
  "orderNo": "1234",
  "recordingNo": 1,
  "locationCode": "FG HU"
}
```

## Offline Capability

The app stores profiles locally using AsyncStorage, allowing you to:
- Work offline after initial setup
- Queue submissions (future feature)
- Maintain profile data between sessions

## Security Notes

- This is a public repository - **DO NOT** commit sensitive data
- Bearer tokens are stored locally on the device
- API endpoints should use HTTPS
- Consider implementing token refresh mechanisms for production use

## License

This project is for internal use only.

## Support

For issues or questions, please open an issue on the GitHub repository.
