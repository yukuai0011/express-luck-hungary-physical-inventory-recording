# Project Documentation

## Architecture Overview

This is a React Native application built with Expo that supports:
- Android (APK)
- iOS (not configured in CI/CD yet)
- Windows Desktop (via Electron)
- Web (via React Native Web)

### Key Technologies

1. **React Native + Expo**: Cross-platform mobile framework
2. **TypeScript**: Type safety and better developer experience
3. **TailwindCSS + DaisyUI**: Styling via NativeWind
4. **Expo Camera**: QR code and barcode scanning
5. **AsyncStorage**: Offline data persistence
6. **Electron**: Windows desktop application wrapper

## Application Flow

### 1. Profile Setup
- User scans two QR codes (API endpoint and recording info)
- Or manually pastes JSON data
- Optionally adds bearer token
- Profile is saved to AsyncStorage for offline use

### 2. Package Scanning
- User scans or enters package number
- Sets package intact status
- Enters quantity if needed
- Submits to API endpoint

### 3. Data Submission
- App sends POST request with package data
- Uses saved profile credentials
- Includes tracking UUID
- Handles CORS and network errors gracefully

## Code Structure

```
src/
├── components/
│   ├── Header.tsx          - App title and branding
│   ├── ProfileSection.tsx  - QR scanning and profile management
│   ├── WorkSection.tsx     - Package scanning and submission
│   └── ScannerModal.tsx    - Camera scanner modal
├── types/
│   └── index.ts           - TypeScript type definitions
└── utils/
    └── index.ts           - Helper functions
```

## Offline Support

The app is designed to work offline:
- Profile data stored in AsyncStorage
- No external dependencies for core functionality
- API calls fail gracefully with error messages
- Future: Queue system for offline submissions

## Security Considerations

⚠️ **Important**: This repository is public!

- Never commit API keys, tokens, or credentials
- Bearer tokens are stored locally on device only
- Use environment variables for any configuration
- API endpoints should implement proper authentication

## GitHub Actions Workflows

### Build Workflow (`.github/workflows/build.yml`)

**Triggers:**
- Push to any branch
- Pull requests
- Manual workflow dispatch

**Jobs:**

1. **build-android**
   - Runs on Ubuntu
   - Installs Node.js and Java
   - Prebuilds Android native code
   - Builds debug APK
   - Uploads APK as artifact

2. **build-windows**
   - Runs on Windows
   - Exports web bundle
   - Builds Windows executable with Electron
   - Uploads EXE/MSI as artifact

3. **release** (only on tags)
   - Creates GitHub release
   - Attaches APK and EXE files

## Customization

### Changing App Name/ID

1. Update `app.json`:
   - `name`
   - `slug`
   - `ios.bundleIdentifier`
   - `android.package`

2. Update `package.json`:
   - `name`
   - `build.appId`

### Adding New Features

1. Create component in `src/components/`
2. Add types to `src/types/index.ts`
3. Import and use in `App.tsx`
4. Test on all platforms

### Styling

Uses TailwindCSS via NativeWind:
- Classes: `className="bg-blue-600 text-white p-4"`
- Custom colors in `tailwind.config.js`
- DaisyUI components available

## Testing

### Manual Testing Checklist

- [ ] QR scanning works on mobile
- [ ] Profile saves and loads correctly
- [ ] Package submission successful
- [ ] Offline mode works
- [ ] Error handling displays correctly
- [ ] Camera permissions requested properly

### Automated Testing

Currently not implemented. Future additions:
- Jest for unit tests
- React Native Testing Library
- E2E tests with Detox

## Deployment

### Android
- APK built automatically on GitHub Actions
- Download from Artifacts
- Install on device via ADB or direct install

### Windows
- EXE built automatically on GitHub Actions
- Download from Artifacts
- Run installer on Windows 10/11

### Manual Deployment
See [INSTALLATION.md](INSTALLATION.md) for local build instructions.

## Troubleshooting

### Common Issues

1. **Camera not working**
   - Check permissions in device settings
   - Web requires HTTPS (except localhost)

2. **Build failures**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Clear Expo cache: `npx expo start -c`
   - Clear Android build: `cd android && ./gradlew clean`

3. **CORS errors**
   - API endpoint must allow your domain
   - Test with Postman first
   - Check API CORS configuration

## Future Enhancements

- [ ] iOS build in GitHub Actions
- [ ] Offline queue for submissions
- [ ] Data export functionality
- [ ] Advanced error reporting
- [ ] Multi-language support
- [ ] Dark/light theme toggle
- [ ] Batch scanning mode
- [ ] History/logs view

## Contributing

Since this is for internal use:
1. Create feature branch
2. Make changes
3. Test on all platforms
4. Create pull request
5. Wait for CI/CD to pass
6. Merge to main

## License

Internal use only - not for public distribution.
