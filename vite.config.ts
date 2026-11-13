import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Served from https://<user>.github.io/2048-project/ on GitHub Pages.
  base: '/2048-project/',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
