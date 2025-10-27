// Nuxt 3 configuration for Tauri desktop/mobile and PWA
// Type hint for static analyzers in this environment
declare const defineNuxtConfig: (config: any) => any;
export default defineNuxtConfig({
  ssr: false,
  modules: [
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt'
  ],
  css: ['~/assets/css/tailwind.css'],
  future: {
    // Ensure Nitro generates static client for packaging
    compatibilityVersion: 4
  },
  app: {
    head: {
      title: 'Express Luck Inventory',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0ea5e9' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ]
    }
  },
  // Vite PWA for web/offline fallback (Tauri runs fully offline already)
  pwa: {
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    manifest: {
      name: 'Express Luck Inventory',
      short_name: 'Inventory',
      description: 'Offline-first physical inventory recording',
      theme_color: '#0ea5e9',
      background_color: '#0b1220',
      start_url: '/',
      display: 'standalone',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 24 * 60 * 60
    }
  },
  nitro: {
    preset: 'node-server'
  },
  typescript: {
    strict: true,
    typeCheck: false
  },
  devServer: {
    port: 3000,
    host: '0.0.0.0'
  }
})
