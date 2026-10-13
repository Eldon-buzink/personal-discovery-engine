import { test, expect, answerDotScale, readSession } from './support'
import { RING1_SEED } from './fixtures'
import type { Page } from '@playwright/test'

// Working style reveals each of its three axes as it completes (after
// questions 7, 14 and 21). Regression tests for the reveal loop: "Keep going"
// used to re-show the boundary question and answering it fired the same
// reveal again. Each reveal must show exactly once per run, in order, and a
// reload / back-forward mid-run must resume at the right question without
// re-firing a reveal already passed.

const TOTAL = 21
const AXES = [
  { name: 'Structure', boundary: 7 },
  { name: 'Independence', boundary: 14 },
  { name: 'Directness', boundary: 21 },
]
const ANSWER_PATTERN = [4, 2, 5, 3, 1]
const answerFor = (questionNumber: number) => ANSWER_PATTERN[(questionNumber - 1) % ANSWER_PATTERN.length]

const revealHeading = (page: Page, axis: string) => page.getByText(`${axis} — your working style pattern`)
const anyReveal = (page: Page) => page.getByText(/ — your working style pattern$/)
const question = (page: Page, n: number) => page.getByText(`${n} of ${TOTAL}`, { exact: true })
const keepGoing = (page: Page) => page.getByRole('button', { name: /^Keep going/ })

async function start(page: Page) {
  await page.goto('/onboarding')
  await page.evaluate((s) => localStorage.setItem('known_session', JSON.stringify(s)), RING1_SEED)
  await page.goto('/assessment/working-style')
  await page.getByRole('button', { name: 'Start this section' }).click()
}

// Answer questions `from`..`to` (1-based, inclusive). Fails if a reveal
// appears anywhere other than right after an axis boundary.
async function answerRange(page: Page, from: number, to: number) {
  for (let n = from; n <= to; n++) {
    await expect(question(page, n)).toBeVisible()
    await expect(anyReveal(page)).toHaveCount(0)
    await answerDotScale(page, answerFor(n))
    const axis = AXES.find((a) => a.boundary === n)
    if (axis && n < to) throw new Error(`answerRange crossed the ${axis.name} boundary; split the range`)
  }
}

test('all three axis reveals show once each, in order, then the result is saved and in the report', async ({ page }) => {
  await start(page)

  let next = 1
  for (const axis of AXES) {
    await answerRange(page, next, axis.boundary)
    await expect(revealHeading(page, axis.name)).toBeVisible()
    await expect(page.getByText(`${axis.boundary} responses · pattern identified`)).toBeVisible()
    if (axis.boundary === TOTAL) break
    await keepGoing(page).click()
    // Keep going lands on the next axis's first question, not the one just
    // answered — and that question doesn't bring the reveal back.
    await expect(question(page, axis.boundary + 1)).toBeVisible()
    await expect(anyReveal(page)).toHaveCount(0)
    next = axis.boundary + 1
  }

  // Final reveal: no Keep going, pattern copy (fallback) shown.
  await expect(keepGoing(page)).toHaveCount(0)
  await expect.poll(async () => {
    const s = await readSession(page)
    return ((s.patternContents ?? []) as { branch?: string }[]).some((e) => e.branch === 'working_style')
  }).toBe(true)

  const session = await readSession(page)
  const ws = (session.branchResponses as Record<string, { answers: { questionId: number }[]; completed?: boolean }>).working_style
  expect(ws.completed).toBe(true)
  expect(ws.answers).toHaveLength(TOTAL)
  expect(new Set(ws.answers.map((a) => a.questionId)).size).toBe(TOTAL)
  const entry = (session.patternContents as { branch?: string; traitWord: string }[]).find((e) => e.branch === 'working_style')!
  expect(entry.traitWord).toBe('Structured')

  await page.goto('/report')
  await expect(page.getByText('How I work').first()).toBeAttached()
})

test('reload mid-axis resumes at the next question; passed reveals do not re-fire', async ({ page }) => {
  await start(page)
  await answerRange(page, 1, 7)
  await expect(revealHeading(page, 'Structure')).toBeVisible()
  await keepGoing(page).click()
  await answerRange(page, 8, 10)

  await page.reload()
  await expect(question(page, 11)).toBeVisible()
  await expect(anyReveal(page)).toHaveCount(0)

  await answerRange(page, 11, 14)
  await expect(revealHeading(page, 'Independence')).toBeVisible()
  await expect(revealHeading(page, 'Structure')).toHaveCount(0)
})

test('reload while on a reveal resumes after the boundary without showing that reveal again', async ({ page }) => {
  await start(page)
  await answerRange(page, 1, 7)
  await expect(revealHeading(page, 'Structure')).toBeVisible()

  await page.reload()
  await expect(question(page, 8)).toBeVisible()
  await expect(anyReveal(page)).toHaveCount(0)

  await answerRange(page, 8, 14)
  await expect(revealHeading(page, 'Independence')).toBeVisible()
})

test('back then forward mid-run restores progress', async ({ page }) => {
  await start(page)
  await answerRange(page, 1, 7)
  await keepGoing(page).click()
  await answerRange(page, 8, 9)

  // The questions are one route, so Back leaves the page; Forward returns
  // and restores from known_session.
  await page.goBack()
  await expect(page).not.toHaveURL(/working-style/)
  await page.goForward()
  await expect(page).toHaveURL(/working-style/)
  await expect(question(page, 10)).toBeVisible()
  await expect(anyReveal(page)).toHaveCount(0)
})
