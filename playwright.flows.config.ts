import { defineConfig, devices } from '@playwright/test'
import { FAKE_SUPABASE_URL } from './e2e/flows/constants'

// End-to-end flow tests (e2e/flows/) — a safety net for refactors. Separate
// from playwright.config.ts (the landing-page baseline screenshots) so the
// two never share a server.
//
// Isolation: the test server is started here with every external service
// disabled, so nothing can reach production or a paid API — server-side
// included (server actions, ad trackers, the Stripe webhook). Values set
// here win over any .env.local (Next only fills env vars that are unset).
// In the browser, e2e/flows/support.ts additionally blocks every non-local
// request and answers Supabase calls with fixed stubs.
const PORT = 3300

export default defineConfig({
  testDir: './e2e/flows',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    contextOptions: { reducedMotion: 'reduce' },
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // Never reuse a server someone else started — it would have real keys.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      // Non-empty so the admin client can be constructed; it only ever
      // talks to the dead FAKE_SUPABASE_URL.
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      // generatePatternCopy: the SDK call fails fast against a closed local
      // port, so the app takes its existing fallback copy (deterministic).
      ANTHROPIC_API_KEY: 'test-disabled',
      ANTHROPIC_BASE_URL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: '',
      STRIPE_SECRET_KEY: '',
      STRIPE_PRICE_ID: '',
      STRIPE_WEBHOOK_SECRET: '',
      NEXT_PUBLIC_META_PIXEL_ID: '',
      META_CONVERSIONS_API_TOKEN: '',
      PINTEREST_AD_ACCOUNT_ID: '',
      PINTEREST_CONVERSIONS_TOKEN: '',
    },
  },
})
