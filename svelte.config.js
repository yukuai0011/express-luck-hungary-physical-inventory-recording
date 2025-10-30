import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // SPA fallback to support client-side routing for any path
      fallback: 'index.html'
    }),
    // Disable prerendering of routes; rely on client-side navigation
    prerender: {
      entries: []
    }
  }
};

export default config;
