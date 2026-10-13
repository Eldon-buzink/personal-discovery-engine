import { test, expect, answerDotScale } from './support'
import {
  MINI_ASSESSMENT_ITEMS,
  MINI_ASSESSMENT_SLUG_TO_FACET,
  scoreMiniAssessment,
  bandForScore,
  type MiniAssessmentSlug,
} from '../../lib/known/miniAssessmentScoring'

// Ad landing page → mini-assessment → result → signup gate, as a logged-out
// visitor. The one write (saving the result row) goes to a stub that returns
// a fixed id and records what would have been saved; nothing reaches
// Supabase. Stops at the AuthModal — no account is created.

const ANSWER_PATTERN = [5, 4, 2, 5, 3, 1]

for (const slug of Object.keys(MINI_ASSESSMENT_SLUG_TO_FACET) as MiniAssessmentSlug[]) {
  test(`mini-assessment ${slug}: landing → quiz → result → signup gate`, async ({ page, supabase }) => {
    const facet = MINI_ASSESSMENT_SLUG_TO_FACET[slug]
    const items = MINI_ASSESSMENT_ITEMS[facet]
    const answers = items.map((_, i) => ANSWER_PATTERN[i % ANSWER_PATTERN.length])
    const band = bandForScore(scoreMiniAssessment(facet, answers))

    const inserts: unknown[] = []
    const resultId = `e2e-mini-${slug}`
    supabase.stub({ method: 'POST', path: /^\/rest\/v1\/mini_assessment_results/, status: 201, body: { id: resultId }, requests: inserts })

    await page.goto(`/start/${slug}`)
    await page.getByRole('button', { name: 'Start the quick check' }).first().click()
    await expect(page).toHaveURL(new RegExp(`/mini-assessment/${slug}$`))

    await page.getByRole('button', { name: 'Start', exact: true }).click()
    for (let i = 0; i < answers.length; i++) {
      const v = answers[i]
      await expect(page.getByText(`${i + 1} of ${items.length}`, { exact: true })).toBeVisible()
      await answerDotScale(page, v)
    }

    await expect(page).toHaveURL(new RegExp(`/mini-assessment/${slug}/result\\?id=${resultId}&band=${band}$`))
    expect(inserts).toHaveLength(1)
    expect(inserts[0]).toMatchObject({ facet_id: facet, responses: answers, band })

    await page.getByRole('button', { name: 'Add to your daily check-ins' }).click()
    await expect(page.getByRole('button', { name: 'Continue →' })).toBeVisible()
    await expect(page.getByText('One more step')).toBeVisible()
  })
}
