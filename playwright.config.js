import { defineConfig, devices } from '@playwright/test';
import packagedChromium, { inflate, setupLambdaEnvironment } from '@sparticuz/chromium';
import { fileURLToPath } from 'node:url';

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const chromiumModuleUrl = import.meta.resolve('@sparticuz/chromium');
const libraryArchive = fileURLToPath(new URL('../bin/al2023.tar.br', chromiumModuleUrl));
await inflate(libraryArchive);
setupLambdaEnvironment('/tmp/al2023/lib');
const chromiumExecutable = await packagedChromium.executablePath();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 60_000,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: externalBaseURL || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: chromiumExecutable, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
  },
  webServer: externalBaseURL ? undefined : {
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'phone-320',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 900 } },
    },
  ],
});
