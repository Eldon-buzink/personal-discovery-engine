# End-to-end flow tests

A safety net for refactors: the main user flows, run in a real browser
against a local dev server. Test-only — no app code was changed for these
and no `data-testid`s were needed (every selector is visible text or an
existing `aria-label`).

```bash
npm run test:flows                  # headless, ~1 minute incl. server start
npm run test:flows -- --repeat-each=3   # stability check
npx playwright test -c playwright.flows.config.ts --ui   # debug
```

No env file is needed. `playwright.flows.config.ts` starts its own server on
port 3300 (never reusing one you have running) with every external service
disabled.

## Isolation — nothing reaches production

- **Server side**: Supabase points at a closed local port, Anthropic at a
  closed port (so pattern copy uses the app's built-in fallback text), and
  Stripe / Meta / Pinterest keys are blank (their code paths return early).
  These values override anything in `.env.local`.
- **Browser side** (`support.ts`, applied to every test automatically): every
  request that isn't to the test server is aborted; Supabase requests get
  fixed stubs (or a 503 when unstubbed).
- Each test runs in a fresh browser context, so `localStorage` /
  `sessionStorage` (the `known_*` session keys) start empty.
- `playwright.config.ts` (the landing-page baseline) ignores `e2e/flows/`, so
  these specs never run against a server with real keys.

## What's covered

| Spec | Flow |
| --- | --- |
| `ring1.spec.ts` | Onboarding → assessment (shuffled 120-question order, progress) → first trait reveal with the expected trait word → "Keep going" opens the save-progress modal. Unpaid: the 5th trait shows the lock screen and Unlock opens the paywall; a saved session at the cap opens on the lock screen. Paid (stubbed `is_paid`): no cap, a 6th trait is revealed. |
| `report.spec.ts` | Seeded session → every trait renders; the suggested branch (computed with the real `suggestNextBranch`) navigates to its route below the cap and opens the paywall at the cap; empty state. |
| `branches.spec.ts` | All five branches: intro → every question → pattern screen; answers and the pattern entry saved in `known_session`, Ring 1 data kept, the report shows the branch's section. The scored trait word per branch is a characterization snapshot for a fixed answer pattern. |
| `mini-assessment.spec.ts` | All three: `/start/<slug>` → quiz → result URL with the expected band → the saved row (stubbed insert) has the right facet/answers/band → "Add to your daily check-ins" opens the signup modal. |

## Known failure (marked, not hidden)

`branch working_style` is marked `test.fail`: after the first axis reveal,
"Keep going" shows question 7 again and answering it repeats the reveal, so
users loop until they reload. Once that's fixed the test will pass and
Playwright will report it — remove the `test.fail` line then.

## Not covered yet, and why

- **Practice** (activate a trait, check in, the 4-trait cap): it writes to
  several tables, so it needs a real test database rather than stubs.
- **Real sign-in / payment completion**: magic links and Stripe Checkout need
  a test Supabase project and Stripe test mode.

A local Supabase (`supabase start`, needs Docker running) would cover both,
but the migrations in `supabase/migrations` can't build the schema from
scratch yet: `anonymous_sessions` and `report_content` were created in the
dashboard and only altered by migrations. A baseline migration of the
production schema (`supabase db pull`, needs the database password) would
fix that.
