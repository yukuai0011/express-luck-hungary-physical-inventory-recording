import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.expressluck.inventory',
  appName: 'Inventory Recorder',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
