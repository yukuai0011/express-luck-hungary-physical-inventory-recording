# Deployment Checklist

## Pre-Deployment Checklist

### 1. Assets Setup
- [ ] Create `assets/icon.png` (1024x1024 px)
- [ ] Create `assets/splash.png` (1284x2778 px)
- [ ] Create `assets/adaptive-icon.png` (1024x1024 px)
- [ ] Create `assets/favicon.png` (48x48 px)
- [ ] Remove `.placeholder` files from assets/

### 2. Configuration
- [ ] Update `app.json` with correct app name
- [ ] Update `package.json` app ID if needed
- [ ] Verify `ios.bundleIdentifier` in `app.json`
- [ ] Verify `android.package` in `app.json`
- [ ] Update `productName` in `package.json` build config

### 3. Code Review
- [ ] Remove any console.log statements (or configure for production)
- [ ] Verify no hardcoded API endpoints
- [ ] Check .gitignore is properly configured
- [ ] Ensure no sensitive data in code
- [ ] Run linter: `npm run lint`
- [ ] Fix TypeScript errors

### 4. Testing
- [ ] Test QR code scanning
- [ ] Test barcode scanning
- [ ] Test profile save/load
- [ ] Test package submission
- [ ] Test offline mode
- [ ] Test error handling
- [ ] Test on Android device/emulator
- [ ] Test on web browser
- [ ] Test Windows desktop build (if applicable)

## Local Build Checklist

### Android APK Build
```bash
# Step 1: Install dependencies
[ ] npm install

# Step 2: Prebuild native code
[ ] npx expo prebuild --platform android --clean

# Step 3: Build APK
[ ] cd android
[ ] ./gradlew assembleRelease  # or assembleDebug

# Step 4: Verify APK
[ ] Check android/app/build/outputs/apk/
[ ] Install on device: adb install app-release.apk
[ ] Test all features on device
```

### Windows EXE Build
```bash
# Step 1: Install dependencies
[ ] npm install

# Step 2: Export web bundle
[ ] npx expo export --platform web --output-dir dist

# Step 3: Build executable
[ ] npm run build:windows

# Step 4: Verify EXE
[ ] Check dist/ folder for .exe and .msi files
[ ] Test installation on Windows 10/11
[ ] Test all features
```

## GitHub Actions Setup Checklist

### 1. Repository Setup
- [ ] Push code to GitHub
- [ ] Verify submodule is properly linked
- [ ] Check .github/workflows/build.yml exists
- [ ] Verify GitHub Actions is enabled for repo

### 2. First Build
- [ ] Push to any branch to trigger build
- [ ] Monitor GitHub Actions tab
- [ ] Check build-android job succeeds
- [ ] Check build-windows job succeeds
- [ ] Verify artifacts are uploaded

### 3. Download and Test
- [ ] Download APK from GitHub Actions artifacts
- [ ] Install APK on Android device
- [ ] Test all features
- [ ] Download EXE from GitHub Actions artifacts
- [ ] Install on Windows machine
- [ ] Test all features

## Release Checklist

### Creating a Release
```bash
# Step 1: Tag the release
[ ] git tag -a v1.0.0 -m "Release version 1.0.0"
[ ] git push origin v1.0.0

# Step 2: Wait for GitHub Actions
[ ] Monitor the release job in GitHub Actions
[ ] Verify GitHub Release is created automatically

# Step 3: Verify Release
[ ] Check GitHub Releases page
[ ] Verify APK is attached
[ ] Verify EXE is attached
[ ] Test downloads work
```

### Release Notes Template
```markdown
## Version 1.0.0

### Features
- QR code scanning for API endpoint and recording info
- Barcode scanning for package numbers
- Offline profile storage
- Cross-platform support (Android, Windows, Web)

### Installation
**Android:**
- Download inventory-scanner.apk
- Enable "Install from unknown sources"
- Install the APK
- Grant camera permissions when prompted

**Windows:**
- Download Inventory-Scanner-Setup.exe
- Run the installer
- Follow installation prompts

### Known Issues
- [List any known issues]

### Requirements
- Android 8.0+ for mobile
- Windows 10+ for desktop
- Camera access required
```

## Post-Deployment Checklist

### 1. User Testing
- [ ] Distribute to test users
- [ ] Collect feedback
- [ ] Document issues
- [ ] Create GitHub issues for bugs

### 2. Monitoring
- [ ] Monitor GitHub Issues
- [ ] Check for crash reports
- [ ] Review user feedback
- [ ] Plan fixes/improvements

### 3. Documentation
- [ ] Update README with release info
- [ ] Document any setup quirks
- [ ] Create user guide if needed
- [ ] Update CHANGELOG

## Troubleshooting Guide

### Build Failures

**Android build fails:**
```bash
# Clear cache and rebuild
cd android
./gradlew clean
cd ..
rm -rf node_modules
npm install
npx expo prebuild --platform android --clean
```

**Windows build fails:**
```bash
# Clear cache
rm -rf node_modules dist
npm install
```

**GitHub Actions fails:**
- Check the logs in GitHub Actions
- Verify all required files are committed
- Check for syntax errors in .yml file
- Ensure secrets are configured (if needed)

### Runtime Issues

**Camera not working:**
- Verify camera permissions granted
- Check device compatibility
- Test on different device
- Review Expo Camera documentation

**API submission fails:**
- Verify API endpoint is accessible
- Check CORS configuration
- Verify bearer token (if required)
- Test with Postman first

**Profile not saving:**
- Check AsyncStorage permissions
- Verify JSON is valid
- Check browser console (web)
- Review app logs

## Security Review Checklist

- [ ] No API keys in code
- [ ] No hardcoded tokens
- [ ] .env files in .gitignore
- [ ] Sensitive data only in AsyncStorage
- [ ] HTTPS for all API calls
- [ ] Input validation on all forms
- [ ] Error messages don't expose internals

## Performance Checklist

- [ ] App starts within 3 seconds
- [ ] Camera opens within 2 seconds
- [ ] Smooth scanning experience
- [ ] No memory leaks
- [ ] Efficient AsyncStorage usage
- [ ] Optimized images in assets/

## Accessibility Checklist

- [ ] All interactive elements have labels
- [ ] Sufficient color contrast
- [ ] Text is readable at default size
- [ ] Touch targets are ≥44x44 px
- [ ] Error messages are clear
- [ ] Success feedback is obvious

## Distribution Checklist

### Internal Distribution
- [ ] Share APK via email/cloud storage
- [ ] Provide installation instructions
- [ ] Include user guide
- [ ] Set up support channel (email/Slack)

### Public Distribution (Future)
- [ ] Google Play Store listing
- [ ] Microsoft Store listing
- [ ] App descriptions
- [ ] Screenshots
- [ ] Privacy policy
- [ ] Terms of service

## Rollback Plan

If deployment fails:

1. **Identify Issue**
   - Check logs
   - Review error messages
   - Test on different devices

2. **Quick Fix Available?**
   - [ ] Create hotfix branch
   - [ ] Fix and test
   - [ ] Deploy hotfix

3. **Major Issue?**
   - [ ] Revert to previous version
   - [ ] Notify users
   - [ ] Plan proper fix
   - [ ] Schedule next release

## Final Sign-Off

Before going live:

- [ ] All tests pass
- [ ] Code reviewed
- [ ] Assets finalized
- [ ] Documentation updated
- [ ] GitHub Actions working
- [ ] Builds tested on devices
- [ ] User feedback collected
- [ ] Known issues documented
- [ ] Support plan in place
- [ ] Rollback plan ready

---

**Deployment Status:**
- [ ] Not Started
- [ ] In Progress
- [ ] Testing
- [ ] Ready for Release
- [ ] Released

**Deployed by:** _____________
**Date:** _____________
**Version:** _____________
