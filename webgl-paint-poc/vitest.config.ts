import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      instances: [
        {
          browser: 'chromium',
          provider: 'webdriverio',
        }
      ],
      // WebGL testing requires a real browser context
      headless: false,
    },
    setupFiles: ['./src/setup.ts'],
  },
});