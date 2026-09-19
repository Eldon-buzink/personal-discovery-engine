import { defineConfig, devices } from '@playwright/test'

// Test tooling only — see reference/landing-redesign.md section 10, Phase 2.
// Does not touch app code, styles, Stripe, auth, or the assessment.
//
// BASE_URL env var (Part 0, recon pass 5): when set, points the whole suite
// at a live target (e.g. https://getbearing.me) instead of the local dev
// server, and skips the webServer block entirely — Playwright must not try
// to boot `npm run dev` (or wait on its port) when there's nothing local to
// serve. e2e/baseline.spec.ts itself switches its own output directory based
// on the same env var (reference/baseline-live/ vs reference/baseline/).
const BASE_URL = process.env.BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: BASE_URL ?? 'http://localhost:3000',
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  ...(BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 60_000,
        },
      }),
})
