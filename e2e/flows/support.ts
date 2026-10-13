import { test as base, expect, type Page, type Route } from '@playwright/test'
import { FAKE_SUPABASE_URL, SUPABASE_AUTH_COOKIE } from './constants'

// ── Network isolation ────────────────────────────────────────────────────────
// Every test gets a fresh browser context (so empty localStorage /
// sessionStorage — the known_* keys are the session model). On top of that:
//   - any request that isn't to the local test server or the fake Supabase
//     origin is aborted (Meta pixel, Stripe, fonts CDNs, …);
//   - requests to the fake Supabase origin go through `supabase` stubs below.
//     Unstubbed Supabase calls get a 503, the same as Supabase being down,
//     and are recorded in `unexpectedSupabaseCalls` for debugging.

export interface SupabaseStub {
  method?: string
  // Matched against the path + query, e.g. /rest/v1/users?select=is_paid…
  path: RegExp
  status?: number
  body: unknown
  // When given, each matching request's JSON body is pushed here.
  requests?: unknown[]
}

export interface FakeUser {
  id: string
  email: string
}

interface Fixtures {
  supabase: {
    stub: (s: SupabaseStub) => void
    // Signed-in browser session for `user`, with /auth/v1/user answering
    // for it. Call before the first page.goto.
    signIn: (user: FakeUser) => Promise<void>
    unexpectedSupabaseCalls: string[]
  }
}

export const test = base.extend<Fixtures>({
  // auto: the network block applies to every test, even ones that never
  // mention `supabase`.
  supabase: [async ({ page, context, baseURL }, use) => {
    const stubs: SupabaseStub[] = []
    const unexpected: string[] = []
    let signedInUser: FakeUser | null = null

    await context.route('**/*', async (route: Route) => {
      const url = new URL(route.request().url())
      if (url.origin === new URL(baseURL!).origin) return route.continue()
      if (url.origin !== FAKE_SUPABASE_URL) return route.abort()

      const method = route.request().method()
      const pathAndQuery = url.pathname + url.search
      if (method === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders() })
      }
      if (url.pathname === '/auth/v1/user') {
        return signedInUser
          ? json(route, 200, fakeAuthUser(signedInUser))
          : json(route, 401, { code: 401, msg: 'no session (e2e stub)' })
      }
      const stub = stubs.find((s) => (!s.method || s.method === method) && s.path.test(pathAndQuery))
      if (stub) {
        stub.requests?.push(route.request().postDataJSON())
        return json(route, stub.status ?? 200, stub.body)
      }
      unexpected.push(`${method} ${pathAndQuery}`)
      return json(route, 503, { message: 'unstubbed Supabase call (e2e)' })
    })

    await use({
      stub: (s) => { stubs.push(s) },
      signIn: async (user) => {
        signedInUser = user
        await context.addCookies([{
          name: SUPABASE_AUTH_COOKIE,
          value: 'base64-' + Buffer.from(JSON.stringify(fakeSession(user))).toString('base64url'),
          url: baseURL!,
        }])
      },
      unexpectedSupabaseCalls: unexpected,
    })
    void page
  }, { auto: true }],
})

export { expect }

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-expose-headers': '*',
  }
}

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    headers: { ...corsHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function fakeAuthUser(user: FakeUser) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

function fakeSession(user: FakeUser) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  // Unsigned, shaped like a Supabase access token; only ever sent to the stub.
  const accessToken = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp })}.e2e`
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    refresh_token: 'e2e-refresh-token',
    user: fakeAuthUser(user),
  }
}

// ── Assessment helpers ───────────────────────────────────────────────────────

// Answer the dot-scale question on screen ("N out of 5", then Next).
export async function answerDotScale(page: Page, value: number) {
  await page.getByRole('button', { name: `${value} out of 5` }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
}

export async function readSession(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('known_session') ?? '{}'))
}
