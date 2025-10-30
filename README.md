# Express Luck Hungary - Physical Inventory Recording (React Native)

A React Native app built with Expo and GlueStack UI for recording physical inventory. This project is set up to run without an Expo account.

## Tech stack

- Expo (managed workflow, no account required)
- React Native
- GlueStack UI (`@gluestack-ui/themed`)
- React Navigation
- Jest for tests

## Prerequisites

- Node.js 18+
- Android Studio (to run on Android) or Xcode (to run on iOS)

## Run locally

```pwsh
# From this folder
npm install
npm run start
# In the Expo dev tools press 'a' for Android emulator or 'w' for web
```

If you want a local native build without an Expo account:

```pwsh
# Android debug build
npm run android

# iOS (on macOS)
npm run ios
```

## Project structure

- `App.tsx` – App entry, GlueStack provider + navigation
- `src/components/InventoryContext.tsx` – Simple inventory store
- `src/screens/*` – Screens: Home, Scan, Inventory
- `.github/workflows/ci.yml` – CI workflow for install + tests

## Notes

- No Expo account is required. All commands used here work offline and without EAS.
- GlueStack UI is used for all UI building blocks.

