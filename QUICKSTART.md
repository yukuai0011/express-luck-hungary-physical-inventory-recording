# Quick Start Guide

## For Development

### Step 1: Install Dependencies
```bash
cd express-luck-hungary-physical-inventory-recording
npm install
```

### Step 2: Start Development Server
```bash
npm start
```

### Step 3: Run on Your Device

**Option A: Use Expo Go (Recommended for quick testing)**
1. Install Expo Go app on your phone (App Store or Play Store)
2. Scan the QR code shown in terminal
3. App will load on your phone

**Option B: Android Emulator**
```bash
npm run android
```

**Option C: Web Browser**
```bash
npm run web
```

**Option D: Windows Desktop**
```bash
npm run electron:dev
```

## For Building Production Files

### Automatic Builds (Recommended)

Simply push your code to GitHub:
```bash
git add .
git commit -m "Your changes"
git push
```

GitHub Actions will automatically build:
- Android APK
- Windows EXE

Download from: **GitHub → Actions → Select your workflow → Artifacts**

### Manual Builds

**Android APK:**
```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```
APK location: `android/app/build/outputs/apk/release/app-release.apk`

**Windows EXE:**
```bash
npx expo export --platform web --output-dir dist
npm run build:windows
```
EXE location: `dist/*.exe`

## App Usage

1. **Setup Profile**
   - Tap "Scan QR" button
   - Scan API endpoint QR code
   - Scan recording info QR code
   - Tap "Save Profile"

2. **Scan Packages**
   - Enter or scan package number
   - Set package intact checkbox
   - Enter quantity if needed
   - Tap "Submit"

## Troubleshooting

**Dependencies fail to install:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Expo cache issues:**
```bash
npx expo start -c
```

**Android build issues:**
```bash
cd android
./gradlew clean
cd ..
```

## Important Notes

⚠️ **No Sensitive Data**: This repo is public - never commit tokens or credentials!

📱 **Camera Permissions**: App will request camera access on first scan

🌐 **Offline Mode**: App works offline after initial setup

## Need Help?

- Check [INSTALLATION.md](INSTALLATION.md) for detailed setup
- Check [DOCUMENTATION.md](DOCUMENTATION.md) for architecture details
- Open an issue on GitHub
