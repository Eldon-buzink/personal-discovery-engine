import { test, expect, answerDotScale, readSession } from './support'
import { computeFacetScore, getTraitWord } from '../../lib/known/scoring'
import { RING1_QUESTIONS } from '../../lib/known/ring1-questions'
import { REVEAL_CAP } from '../../lib/known/paywall'

// Ring 1 (the 120-question assessment), anonymous and paid.
//
// The app shuffles question order per session. After checking that a fresh
// session gets a full shuffled order, these tests seed known_session with the
// natural order 1..120 instead: ids come in groups of four per facet
// (1–4 Anxiety, 5–8 Anger, …), so every four answers complete one facet and
// reveals land at predictable points.

const NATURAL_ORDER = RING1_QUESTIONS.map((q) => q.id)
const FACETS_IN_ORDER = Array.from(new Set(RING1_QUESTIONS.map((q) => q.facet)))

function expectedTraitWord(facet: string, values: Map<number, number>) {
  return getTraitWord(facet, computeFacetScore(facet, values)!)
}

// A session where the first `facetCount` facets are already answered (all
// 4s) and revealed, as the app itself would have saved it.
function sessionWithRevealedFacets(facetCount: number) {
  const answeredIds = NATURAL_ORDER.slice(0, facetCount * 4)
  const facets = FACETS_IN_ORDER.slice(0, facetCount)
  const values = new Map(answeredIds.map((id) => [id, 4]))
  return {
    questionOrder: NATURAL_ORDER,
    responses: answeredIds.map((id) => ({ questionId: id, value: 4, answeredAt: '2026-10-01T10:00:00.000Z' })),
    patternShown: { facet: facets[0], traitWord: expectedTraitWord(facets[0], values), answeredAt: '2026-10-01T10:00:00.000Z' },
    revealedFacets: facets,
  }
}

async function seedSession(page: import('@playwright/test').Page, session: unknown) {
  await page.goto('/onboarding')
  await page.evaluate((s) => localStorage.setItem('known_session', JSON.stringify(s)), session)
}

test('anonymous: onboarding → questions → first trait → save-progress modal', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: 'Start', exact: true }).click()

  await expect(page).toHaveURL(/\/assessment$/)
  await expect(page.getByText('1 of 120', { exact: true })).toBeVisible()
  const fresh = await readSession(page)
  expect((fresh.questionOrder as number[]).length).toBe(120)
  expect(new Set(fresh.questionOrder as number[]).size).toBe(120)

  await answerDotScale(page, 3)
  await expect(page.getByText('2 of 120', { exact: true })).toBeVisible()
  expect(((await readSession(page)).responses as unknown[]).length).toBe(1)

  // Natural order from here: four answers complete the first facet.
  await page.evaluate((order) => localStorage.setItem('known_session', JSON.stringify({ questionOrder: order, responses: [] })), NATURAL_ORDER)
  await page.reload()
  await expect(page.getByText('1 of 120', { exact: true })).toBeVisible()

  const answers = [4, 5, 4, 3]
  for (let i = 0; i < answers.length; i++) {
    const v = answers[i]
    await expect(page.getByText(`${i + 1} of 120`, { exact: true })).toBeVisible()
    await answerDotScale(page, v)
  }

  const facet = FACETS_IN_ORDER[0]
  const traitWord = expectedTraitWord(facet, new Map(NATURAL_ORDER.slice(0, 4).map((id, i) => [id, answers[i]])))
  await expect(page.getByText(`1 of ${REVEAL_CAP} traits discovered`)).toBeVisible()
  await expect(page.getByText(traitWord, { exact: true }).first()).toBeVisible()

  const session = await readSession(page)
  expect(session.revealedFacets).toEqual([facet])
  expect(session.patternShown).toMatchObject({ facet, traitWord })

  // "Keep going" appears once the pattern copy is in (the fallback copy here).
  await page.getByRole('button', { name: /Keep going/ }).click()
  await expect(page.getByRole('button', { name: 'Save and continue' })).toBeVisible()
})

test(`unpaid: the ${REVEAL_CAP}th trait locks the assessment and Unlock opens the paywall`, async ({ page }) => {
  await seedSession(page, sessionWithRevealedFacets(1))
  await page.goto('/assessment')
  await expect(page.getByText('5 of 120', { exact: true })).toBeVisible()

  // Facets 2..REVEAL_CAP, four answers each.
  for (let i = 0; i < (REVEAL_CAP - 1) * 4; i++) {
    await expect(page.getByText(`${i + 5} of 120`, { exact: true })).toBeVisible()
    await answerDotScale(page, 4)
  }

  await expect(page.getByText(`${REVEAL_CAP} of ${REVEAL_CAP} traits discovered`)).toBeVisible()
  expect((await readSession(page)).revealedFacets).toEqual(FACETS_IN_ORDER.slice(0, REVEAL_CAP))

  await page.getByRole('button', { name: 'Unlock full access' }).click()
  await expect(page.getByText('Unlock your full report')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unlock the full picture →' })).toBeVisible()
})

test('unpaid: a saved session already at the cap opens on the lock screen', async ({ page }) => {
  await seedSession(page, sessionWithRevealedFacets(REVEAL_CAP))
  await page.goto('/assessment')
  await expect(page.getByRole('button', { name: 'Unlock full access' })).toBeVisible()
  await expect(page.getByText(/^\d+ of 120$/)).toHaveCount(0)
})

test('paid: no cap — questions continue past it and the next trait is revealed', async ({ page, supabase }) => {
  const user = { id: '00000000-0000-4000-8000-00000000e2e1', email: 'e2e-paid@example.test' }
  await supabase.signIn(user)
  supabase.stub({ method: 'GET', path: /^\/rest\/v1\/users\?.*is_paid/, body: [{ is_paid: true }] })

  await seedSession(page, sessionWithRevealedFacets(REVEAL_CAP))
  await page.goto('/assessment')

  const next = REVEAL_CAP * 4 + 1
  await expect(page.getByText(`${next} of 120`, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unlock full access' })).toHaveCount(0)

  for (let i = 0; i < 4; i++) {
    await expect(page.getByText(`${next + i} of 120`, { exact: true })).toBeVisible()
    await answerDotScale(page, 4)
  }

  await expect(page.getByText(`${next + 4} of 120`, { exact: true })).toBeVisible()
  await expect.poll(async () => ((await readSession(page)).revealedFacets as string[]).length).toBe(REVEAL_CAP + 1)
  await expect(page.getByRole('button', { name: 'Unlock full access' })).toHaveCount(0)
})
