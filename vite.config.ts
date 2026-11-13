import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { precacheServiceWorker } from './tools/vite-precache.js';

export default defineConfig({
  // Served from https://<user>.github.io/2048-project/ on GitHub Pages.
  base: '/2048-project/',
  build: {
    target: 'es2022',
  },
  plugins: [
    precacheServiceWorker({
      entry: fileURLToPath(new URL('./src/pwa/sw.ts', import.meta.url)),
      // Link previews and install prompts fetch these themselves; the page never shows them.
      exclude: (file) => file === 'og-image.png' || file.endsWith('-512.png'),
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
