# Installation Guide

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/

2. **Git**
   - Download from: https://git-scm.com/

3. **For Android Development:**
   - Android Studio: https://developer.android.com/studio
   - Android SDK (installed via Android Studio)

4. **For Windows Development:**
   - Windows 10 or 11
   - Visual Studio Build Tools (for native modules)

## Setup Steps

### 1. Clone the Repository

```bash
git clone --recurse-submodules https://github.com/yukuai0011/express-luck-hungary-physical-inventory-recording.git
cd express-luck-hungary-physical-inventory-recording/express-luck-hungary-physical-inventory-recording
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Development

#### Run on Mobile (Expo Go)

```bash
# Start the development server
npm start

# Scan the QR code with Expo Go app on your phone
# iOS: Download Expo Go from App Store
# Android: Download Expo Go from Play Store
```

#### Run on Web Browser

```bash
npm run web
```

#### Run on Android Emulator

```bash
# Make sure Android Studio and an emulator are set up
npm run android
```

#### Run Windows Desktop (Electron)

```bash
# Development mode
npm run electron:dev
```

### 4. Building for Production

#### Android APK (Automated via GitHub Actions)

Every push to any branch will automatically build an APK. You can download it from:
- GitHub Actions → Select your workflow run → Artifacts

To build locally:
```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

#### Windows EXE (Automated via GitHub Actions)

Every push to any branch will automatically build a Windows executable. Download from GitHub Actions artifacts.

To build locally:
```bash
npx expo export --platform web --output-dir dist
npm run build:windows
# Output: dist/*.exe
```

## Troubleshooting

### Android Build Issues

1. **SDK not found**: Open Android Studio → SDK Manager → Install Android SDK Platform 33+
2. **Gradle issues**: Run `cd android && ./gradlew clean`

### Windows Build Issues

1. **Native module errors**: Install Visual Studio Build Tools
2. **Electron issues**: Delete `node_modules` and run `npm install` again

### Camera Not Working

1. Ensure you've granted camera permissions
2. On web: Use HTTPS or localhost
3. On mobile: Check app permissions in device settings

## Environment Variables (Optional)

Create a `.env` file in the root directory:

```env
# No sensitive data - this is a public repo!
EXPO_PUBLIC_API_VERSION=1.0.0
```

## Next Steps

1. Read the [README.md](README.md) for usage instructions
2. Check the [GitHub Actions](.github/workflows/build.yml) configuration
3. Start developing!

## Support

- Open an issue on GitHub for bugs
- Check existing issues for solutions
- Review the Expo documentation: https://docs.expo.dev/
