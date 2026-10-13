import { test, expect, answerDotScale, readSession } from './support'
import { RING1_SEED } from './fixtures'

// The five paid branches, start to finish: intro → every question → pattern
// screen. Branch pages have no paid gate of their own (that lives on the
// report's CTAs), so they run here as an anonymous visitor.
//
// Answers follow a fixed repeating pattern, so the scored result is
// deterministic. EXPECTED is a characterization snapshot of what the current
// scoring produces for that pattern — a refactor that changes scoring (or the
// question order) changes it, which is exactly what this should catch.
//
// Pattern copy comes from generatePatternCopy's fallback (the test server
// can't reach Anthropic), so content is fixed too.

const ANSWER_PATTERN = [4, 2, 5, 3, 1]


interface BranchCase {
  route: string
  key: 'energy' | 'environment' | 'relationships' | 'direction' | 'working_style'
  reportSection: string
}

const BRANCHES: BranchCase[] = [
  { route: '/assessment/energy', key: 'energy', reportSection: 'Your energy' },
  { route: '/assessment/environment', key: 'environment', reportSection: 'Where you thrive' },
  { route: '/assessment/relationships', key: 'relationships', reportSection: 'How I connect' },
  { route: '/assessment/direction', key: 'direction', reportSection: 'Where this might lead' },
  { route: '/assessment/working-style', key: 'working_style', reportSection: 'How I work' },
]

// Recorded from the current code (2026-10-13) — see the header comment.
// working_style's value was recorded by reloading at each axis reveal (the
// workaround for the reveal loop fixed in fix-working-style-loop); the fixed
// flow produces the same result.
const EXPECTED: Record<BranchCase['key'], { questions: number; traitWord: string }> = {
  energy: { questions: 24, traitWord: 'Having a say' },
  environment: { questions: 15, traitWord: 'Low interruption' },
  relationships: { questions: 15, traitWord: 'Open' },
  direction: { questions: 24, traitWord: 'Making things work' },
  working_style: { questions: 21, traitWord: 'Structured' },
}

for (const b of BRANCHES) {
  test(`branch ${b.key}: intro → all questions → pattern, saved to known_session`, async ({ page }) => {

    // Real users reach a branch from the report, so they already have Ring 1
    // results; the report only shows branch sections alongside those.
    await page.goto('/onboarding')
    await page.evaluate((s) => localStorage.setItem('known_session', JSON.stringify(s)), RING1_SEED)

    await page.goto(b.route)
    await page.getByRole('button', { name: 'Start this section' }).click()

    const progress = page.getByText(/^\d+ of \d+$/)
    await expect(progress).toBeVisible()
    const total = Number((await progress.textContent())!.split(' of ')[1])

    // Working style reveals each axis as it completes (a pattern screen with
    // "Keep going" mid-way); other branches go straight through.
    const keepGoing = page.getByRole('button', { name: /^Keep going/ })
    for (let i = 0; i < total; i++) {
      const question = page.getByText(`${i + 1} of ${total}`, { exact: true })
      await expect(question.or(keepGoing)).toBeVisible()
      if (await keepGoing.isVisible()) {
        await keepGoing.click()
        await expect(question).toBeVisible()
      }
      await answerDotScale(page, ANSWER_PATTERN[i % ANSWER_PATTERN.length])
    }
    await expect(page.getByText(/^\d+ of \d+$/)).toHaveCount(0)

    // Answers are saved as they go; the pattern entry lands once the copy
    // (fallback) comes back.
    await expect.poll(async () => {
      const s = await readSession(page)
      return ((s.patternContents ?? []) as { branch?: string }[]).some((e) => e.branch === b.key)
    }).toBe(true)

    const session = await readSession(page)
    const responses = (session.branchResponses as Record<string, { answers: unknown[]; completed?: boolean }>)[b.key]
    expect(responses.completed).toBe(true)
    expect(responses.answers).toHaveLength(total)
    const entry = (session.patternContents as { branch?: string; traitWord: string }[]).find((e) => e.branch === b.key)!

    expect({ questions: total, traitWord: entry.traitWord }).toEqual(EXPECTED[b.key])

    // The branch adds to the session; it must not drop the Ring 1 results.
    expect(session.revealedFacets).toEqual(RING1_SEED.revealedFacets)
    expect((session.patternContents as { facet: string; branch?: string }[]).some((e) => !e.branch && e.facet === 'Anxiety')).toBe(true)

    // And the report picks the completed branch up as its own section.
    await page.goto('/report')
    await expect(page.getByText(b.reportSection).first()).toBeAttached()
  })
}
