# Bearing

Bearing (getbearing.me) is a personality assessment built on the Big Five
(IPIP-NEO-120). People rate 120 short statements, see their first patterns
for free without an account, and can pay to unlock the deeper branches
(energy, environment, relationships, direction, working style). Short
"mini-assessments" per facet act as entry points, and a signed-in
**practice** area turns report traits into daily check-ins with
weekly / monthly / quarterly reads.

The repo and package still carry the earlier working name ("known",
`known-scaffold`): `components/known`, `lib/known`, and the `known_*`
browser-storage keys. Don't rename the storage keys — existing users have
data under them.

## Stack

- Next.js 14 (App Router), React 18, TypeScript, Tailwind (plus a lot of
  inline styles copied from the design mockups)
- Supabase: auth (email OTP / magic link), Postgres with RLS
  (`supabase/migrations`)
- Stripe: Embedded Checkout (inside the paywall modal), webhook at `app/api/webhooks/stripe`
- Anthropic SDK: pattern copy generated server-side
  (`app/actions/generatePatternCopy.ts`)
- Meta Pixel / Conversions API and Pinterest Conversions API for ad
  attribution
- Hosted on Vercel (`vercel.json`)

## Getting started

```bash
npm install
# create .env.local with the variables below
npm run dev                  # http://localhost:3000
```

### Environment variables

Read from the code (`process.env.*`):

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin client (`lib/supabase/admin.ts`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Elements in the browser |
| `STRIPE_SECRET_KEY` | Server-side Stripe calls |
| `STRIPE_PRICE_ID` | The price for the full assessment |
| `STRIPE_WEBHOOK_SECRET` | Verifying `app/api/webhooks/stripe` |
| `ANTHROPIC_API_KEY` | Pattern copy generation |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel (root layout) |
| `META_CONVERSIONS_API_TOKEN` | Meta Conversions API (server) |
| `PINTEREST_AD_ACCOUNT_ID`, `PINTEREST_CONVERSIONS_TOKEN` | Pinterest Conversions API (server) |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build — also runs ESLint and type-checking; run it before pushing (`tsc --noEmit` alone misses lint errors that fail the Vercel build) |
| `npm run lint` | ESLint (`next lint`) |
| `npm run test:unit` | Unit tests: `tsx --test lib/**/*.test.ts` (node:test) |
| `npm run test:e2e` | All Playwright specs in `e2e/` |
| `npm run test:baseline` | Playwright screenshots of the landing page (`/`) only — it does not cover the assessment, report, paywall or practice flows |

## Folder map

```
app/
  (site)/            marketing pages with the site nav: landing, pricing, blog, about, legal
  (app)/practice/    signed-in practice: home, manage, quarterly review, per-trait detail, check-in and report
  assessment/        main assessment (page.tsx) + one folder per paid branch
  mini-assessment/   per-facet mini-assessment and its result page
  start/[facet]/     per-facet landing pages for ads
  onboarding/        pre-assessment onboarding
  report/            the report (and /report/sample)
  auth/              Supabase auth callback + claiming an anonymous session
  actions/           server actions (checkout, pattern copy, reveals, ad events)
  api/               OG images, Stripe webhook
components/known/    shared UI: SiteNav/SiteFooter, PaywallModal, AuthModal, visuals
lib/known/           scoring, branch scoring, practice logic (+ *.test.ts)
lib/supabase/        browser client (client.ts) and server admin client (admin.ts)
lib/blog/, content/  blog content and helpers
supabase/            local config and SQL migrations
reference/           design mockups, specs and handover notes (not shipped)
e2e/                 Playwright specs
ads/                 Remotion sub-project for ad creatives (own deps)
```

## Session model and browser storage

Answers live in the browser first; an account is only needed to save
progress, pay, or use the practice.

| Key | Storage | Holds |
| --- | --- | --- |
| `known_session` | localStorage | The assessment session: responses, revealed patterns (`patternContents`), branch answers (`branchResponses`). Read and written by the assessment, branch, report and landing pages. |
| `known_pending_session_id` | localStorage | Id of the anonymous session row saved to Supabase, waiting to be claimed after sign-in (`app/auth/claim`). |
| `known_post_auth_path` | localStorage | Where to return after the auth callback. |
| `known_post_auth_reopen_paywall` | localStorage | Reopen the paywall after signing in from it. |
| `known_pending_mini_assessment_id` | localStorage | Mini-assessment result waiting to be claimed after sign-up. |
| `known_mini_assessment_session_id` | localStorage | The in-progress mini-assessment. |
| `known_anon_id` | localStorage | Anonymous id set in onboarding. |
| `known_from` | sessionStorage | Which screen sent the user (`onboarding`, `pattern`), for one-off entry transitions. |
| `known_nudge_dismissed_<activationId>` | sessionStorage | Practice home's low-engagement nudge, dismissed for this tab session. |
