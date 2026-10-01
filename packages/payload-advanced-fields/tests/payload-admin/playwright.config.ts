import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3210';
const databaseURL =
  process.env.PAYLOAD_TEST_DATABASE_URL ??
  'postgres://payload_fields_test:payload_fields_test@127.0.0.1:55432/payload_fields_test';
process.env.DATABASE_URL = databaseURL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
  },
  globalSetup: './tests/global-setup.ts',
  webServer: {
    command: 'npm run dev -- --port 3210',
    url: `${baseURL}/admin`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: databaseURL,
      PAYLOAD_SECRET: 'payload-fields-fixture-secret-change-me',
      PAYLOAD_TEST_EMAIL: 'admin@example.test',
      PAYLOAD_TEST_PASSWORD: 'payload-fields-test-password',
    },
  },
});
