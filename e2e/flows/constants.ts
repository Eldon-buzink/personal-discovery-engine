// Shared by playwright.flows.config.ts and the specs. No Playwright imports
// here — the config loads this file too.

// A closed local port: the app's Supabase client is pointed here, so any
// request it makes (browser or server) can never reach the real project.
// In the browser, support.ts intercepts requests to this origin and answers
// them with stubs.
export const FAKE_SUPABASE_URL = 'http://127.0.0.1:54399'

// supabase-js storage key: `sb-<first label of the URL host>-auth-token`.
export const SUPABASE_AUTH_COOKIE = 'sb-127-auth-token'
