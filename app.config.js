/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  name: "Inventory Scanner",
  slug: "express-luck-hungary-physical-inventory-recording",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  platforms: ["ios", "android", "web"],
  updates: {
    enabled: false
  },
  assetBundlePatterns: ["**/*"],
  web: {
    bundler: "metro"
  },
  ios: {
    supportsTablet: true
  },
  android: {
    permissions: ["CAMERA"]
  }
};
