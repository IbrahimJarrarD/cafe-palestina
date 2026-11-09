import { defineConfig, devices } from '@playwright/test';

const PORT = 4329;

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: process.env.BASE_URL ?? `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `astro dev --port ${PORT}`,
        url: `http://localhost:${PORT}/admin/login`,
        reuseExistingServer: true,
      },
});
