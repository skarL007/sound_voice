import { defineConfig } from '@playwright/test'

/**
 * E2E tests drive the built Electron app (out/main/index.js). Run `npm run build`
 * first. The `@online` tag marks tests that hit the real Edge TTS network; they
 * are excluded from CI via `--grep-invert @online`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  retries: process.env.CI ? 1 : 0,
})
