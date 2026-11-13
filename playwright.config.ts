/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';
import { chromiumOptions } from './tools/chromium';

const PORT = 4173;

/**
 * End-to-end smoke tests against the production build (`vite preview`), in a
 * phone viewport. Unit tests cover the rules; these check that the pieces are
 * wired together in a real browser: input, saving, the service worker.
 */
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: `http://localhost:${PORT}/2048-project/`,
    launchOptions: chromiumOptions(),
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/2048-project/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
