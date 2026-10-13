import { test, expect } from './support'
import { computeFacetScore, getTraitWord } from '../../lib/known/scoring'
import { RING1_QUESTIONS } from '../../lib/known/ring1-questions'
import { suggestNextBranch, type Branch } from '../../lib/known/branchSuggestion'
import { REVEAL_CAP } from '../../lib/known/paywall'

// /report from a seeded known_session (no assessment run needed).

// Must match BRANCH_DISPLAY_NAMES / BRANCH_ROUTES in app/report/page.tsx —
// that mapping is what these tests check.
const BRANCH_DISPLAY_NAMES: Record<Branch, string> = {
  environment: 'Your environment',
  relationships: 'How I connect',
  energy: 'Your energy',
  working_style: 'Your working style',
  direction: 'Your direction',
}
const BRANCH_ROUTES: Record<Branch, string> = {
  environment: '/assessment/environment',
  relationships: '/assessment/relationships',
  energy: '/assessment/energy',
  working_style: '/assessment/working-style',
  direction: '/assessment/direction',
}

const FACETS_IN_ORDER = Array.from(new Set(RING1_QUESTIONS.map((q) => q.facet)))
const dir = (s: number) => (s >= 3.5 ? 'high' : s >= 2.5 ? 'mid' : 'low') as 'high' | 'mid' | 'low'

const FIXED_CONTENT = {
  trait_quote: 'E2E trait quote.',
  where_it_shows_up: 'E2E where it shows up.',
  tags: ['E2E'],
  go_deeper: 'E2E go deeper.',
  worth_trying: 'E2E worth trying.',
}

// The first `count` facets answered all-`value` and revealed, with content
// already generated — the shape the assessment page saves.
function ring1Session(count: number, value: number) {
  const facets = FACETS_IN_ORDER.slice(0, count)
  const ids = RING1_QUESTIONS.filter((q) => facets.includes(q.facet)).map((q) => q.id)
  const answers = new Map(ids.map((id) => [id, value]))
  const entries = facets.map((facet) => {
    const score = computeFacetScore(facet, answers)!
    return { facet, traitWord: getTraitWord(facet, score), scoreDirection: dir(score), content: FIXED_CONTENT }
  })
  return {
    entries,
    session: {
      questionOrder: RING1_QUESTIONS.map((q) => q.id),
      responses: ids.map((id) => ({ questionId: id, value, answeredAt: '2026-10-01T10:00:00.000Z' })),
      patternShown: { facet: facets[0], traitWord: entries[0].traitWord, answeredAt: '2026-10-01T10:00:00.000Z' },
      revealedFacets: facets,
      patternContents: entries,
    },
  }
}

async function openReport(page: import('@playwright/test').Page, session: unknown) {
  await page.goto('/onboarding')
  await page.evaluate((s) => localStorage.setItem('known_session', JSON.stringify(s)), session)
  await page.goto('/report')
}

test('renders every revealed trait and routes the suggested branch', async ({ page }) => {
  const { entries, session } = ring1Session(REVEAL_CAP - 1, 1)
  const suggestion = suggestNextBranch(entries.map((e) => ({ ...e, branch: 'ring1' })) as never, [])!
  expect(suggestion.isTargeted).toBe(true)

  await openReport(page, session)
  await expect(page.getByText('Who you are').first()).toBeVisible()
  for (const e of entries) {
    await expect(page.getByText(e.traitWord, { exact: true }).first()).toBeAttached()
  }

  // Below the free cap, the sticky bar's branch CTA navigates straight there.
  const label = `Unlock ${BRANCH_DISPLAY_NAMES[suggestion.branch]} →`
  await page.getByRole('button', { name: label }).click()
  await expect(page).toHaveURL(new RegExp(`${BRANCH_ROUTES[suggestion.branch]}$`))
  await expect(page.getByRole('button', { name: 'Start this section' })).toBeVisible()
})

test(`at the free cap (${REVEAL_CAP} traits), the branch CTA opens the paywall instead`, async ({ page }) => {
  const { entries, session } = ring1Session(REVEAL_CAP, 1)
  const suggestion = suggestNextBranch(entries.map((e) => ({ ...e, branch: 'ring1' })) as never, [])!

  await openReport(page, session)
  const label = suggestion.isTargeted ? `Unlock ${BRANCH_DISPLAY_NAMES[suggestion.branch]} →` : 'Keep discovering →'
  await page.getByRole('button', { name: label }).click()
  await expect(page.getByText('Unlock your full report')).toBeVisible()
  await expect(page).toHaveURL(/\/report$/)
})

test('with nothing saved, the report shows its empty state', async ({ page }) => {
  await page.goto('/report')
  await expect(page.getByText('This is where your patterns will live.')).toBeVisible()
  await expect(page.getByText('Who you are')).toHaveCount(0)
})
