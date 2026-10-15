# Bearing

Bearing is a Big Five personality assessment that helps you get to know yourself better, and then keep noticing your patterns day to day.

Live at [getbearing.me](https://www.getbearing.me).

## What it does

- **The assessment.** 120 short statements from the IPIP-NEO-120, scored across the 30 Big Five facets. It takes about 15 minutes. The first 5 patterns are free, no account needed.
- **The report.** Each facet gets a trait word, a position on its spectrum and a short written explanation. The scores are computed in the code; only the explanation text is written by an AI model (Claude, by Anthropic).
- **Deeper assessments.** Optional sections on energy, working style, direction, environment and relationships, unlocked with a one-time payment.
- **Quick checks.** Short mini-assessments on one theme (discipline, anxiety, values) under `/start/{facet}`.
- **Practice.** Pick the patterns you care about, answer one check-in question at the end of the day, and see weekly reads and longer trends built from your own answers.
- **Blog and trait library.** Explainers on every facet and the frameworks behind the assessment, written in MDX.

## Tech stack

- [Next.js 14](https://nextjs.org) (App Router), React 18, TypeScript, Tailwind CSS
- [Supabase](https://supabase.com) for auth (email sign-in links) and the database
- [Stripe](https://stripe.com) for the one-time payment
- [Anthropic API](https://docs.anthropic.com) for the written explanations
- Hosted on [Vercel](https://vercel.com)

## Getting started

You need Node.js 18.17 or later and npm.

```bash
npm install
# create .env.local with the variables below
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Environment variables

Set these in `.env.local` (and in Vercel for deployments). Never commit real values.

| Variable | What it is for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key, server only |
| `ANTHROPIC_API_KEY` | Writes the pattern explanations |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe checkout in the browser |
| `STRIPE_SECRET_KEY` | Stripe on the server |
| `STRIPE_PRICE_ID` | The price for the full unlock |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook calls |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta ads measurement (optional, only after consent) |
| `META_CONVERSIONS_API_TOKEN` | Meta conversions API (optional) |
| `PINTEREST_AD_ACCOUNT_ID` | Pinterest conversions (optional) |
| `PINTEREST_CONVERSIONS_TOKEN` | Pinterest conversions (optional) |

### Database

The schema lives in `supabase/migrations`, and the auth email templates in `supabase/templates`. With the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (also runs ESLint and type checks) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test:unit` | Unit tests (`lib/**/*.test.ts`, Node's test runner via `tsx`) |
| `npm run test:e2e` | Playwright end-to-end tests (`e2e/`) |

Run `npm run build` before pushing: it catches lint errors that a type check alone misses.

## Project structure

```
app/
  (site)/        Public pages: landing, pricing, about, blog, traits, how it works, legal
  (app)/         Signed-in pages: practice and check-ins
  assessment/    The main assessment and the deeper sections
  mini-assessment/, start/   Quick checks on one theme
  report/        The report and the public sample report
  actions/       Server actions (written explanations, checkout, accounts)
  api/           Open Graph image and the Stripe webhook
components/      UI components (report visuals, practice cards, blog)
content/blog/    Blog posts in MDX
lib/known/       Scoring, check-ins, trends and report copy (with unit tests)
lib/blog/        Blog loading and table of contents
supabase/        Migrations, auth email templates, local config
e2e/             Playwright tests
```

## How scoring works

Each facet is the mean of its four statements on a 1 to 5 scale, with reverse-keyed statements flipped. Scores fall into low, mid or high bands, and each band has its own trait word. All of this happens in `lib/known/scoring.ts`; the AI model never changes a score. More detail is on [How it works](https://www.getbearing.me/how-it-works).

The assessment items come from the [International Personality Item Pool](https://ipip.ori.org), which is in the public domain.
